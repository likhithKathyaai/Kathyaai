import {createClient} from '@supabase/supabase-js';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

const json=(res,status,data)=>res.status(status).json(data);
const MAX_BYTES=25*1024*1024;
const MAX_CHARS=200000;

export async function extractPdfText(buffer,{maxChars=MAX_CHARS,parser=getDocument}={}){
 const task=parser({data:new Uint8Array(buffer),isEvalSupported:false,disableFontFace:true,useSystemFonts:true});
 const document=await task.promise;
 let text='';
 try{
  for(let pageNumber=1;pageNumber<=document.numPages&&text.length<maxChars;pageNumber++){
   const page=await document.getPage(pageNumber);
   const content=await page.getTextContent();
   text+=content.items.map(item=>typeof item.str==='string'?item.str:'').join(' ')+'\n';
   await page.cleanup?.();
  }
  return text.slice(0,maxChars);
 }finally{await task.destroy?.();}
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return json(res,503,{error:'Workspace database is not configured'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const {documentId}=req.body||{};
 if(typeof documentId!=='string'||! /^[0-9a-f-]{36}$/i.test(documentId))return json(res,400,{error:'Valid knowledge document ID required'});
 const {data:doc,error:docError}=await db.from('knowledge_documents')
  .select('id,organization_id,title,source_type,storage_path,mime_type,file_size_bytes,metadata')
  .eq('id',documentId).maybeSingle();
 if(docError||!doc)return json(res,404,{error:'Knowledge document not found in this workspace'});
 const {data:membership,error:memberError}=await db.from('organization_members')
  .select('role').eq('organization_id',doc.organization_id).eq('user_id',user.id).maybeSingle();
 if(memberError||!membership||!['owner','admin','member'].includes(membership.role))return json(res,403,{error:'Workspace editor permission required'});
 if(!doc.storage_path||doc.source_type!=='file')return json(res,400,{error:'This document does not have an uploaded file'});
 if(Number(doc.file_size_bytes||0)>MAX_BYTES)return json(res,413,{error:'File exceeds the 25 MB limit'});
 try{
  const {data:file,error:downloadError}=await db.storage.from('kathya-knowledge').download(doc.storage_path);
  if(downloadError||!file)throw new Error('The private knowledge file could not be downloaded');
  const buffer=Buffer.from(await file.arrayBuffer());
  if(buffer.length>MAX_BYTES)throw new Error('File exceeds the 25 MB limit');
  const lower=doc.title.toLowerCase();
  const mime=String(doc.mime_type||'').toLowerCase();
  let extracted='';
  if(mime==='application/pdf'||lower.endsWith('.pdf')){
   const parsed=await pdfParse(buffer);
   extracted=parsed.text||'';
  }else if(mime.includes('wordprocessingml')||lower.endsWith('.docx')){
   const parsed=await mammoth.extractRawText({buffer});
   extracted=parsed.value||'';
  }else if(mime.startsWith('text/')||mime==='application/vnd.ms-excel'||lower.endsWith('.txt')||lower.endsWith('.md')||lower.endsWith('.csv')){
   extracted=buffer.toString('utf8');
  }else{
   throw new Error('Supported formats are PDF, DOCX, TXT, Markdown and CSV. Legacy DOC files are not supported.');
  }
  extracted=String(extracted).replace(/\u0000/g,'').replace(/\r\n?/g,'\n').trim();
  if(!extracted)throw new Error('No readable text was found in this file');
  const wasTrimmed=extracted.length>MAX_CHARS;
  extracted=extracted.slice(0,MAX_CHARS);
  const {error:updateError}=await db.from('knowledge_documents').update({
   content_text:extracted,status:'ready',
   metadata:{...(doc.metadata||{}),extracted_at:new Date().toISOString(),character_count:extracted.length,truncated:wasTrimmed}
  }).eq('id',doc.id).eq('organization_id',doc.organization_id);
  if(updateError)throw new Error('Extracted text could not be saved to the workspace');
  return json(res,200,{ready:true,documentId:doc.id,characterCount:extracted.length,truncated:wasTrimmed});
 }catch(error){
  await db.from('knowledge_documents').update({
   status:'failed',metadata:{...(doc.metadata||{}),processing_error:String(error.message||'Extraction failed').slice(0,240),failed_at:new Date().toISOString()}
  }).eq('id',doc.id).eq('organization_id',doc.organization_id);
  return json(res,422,{error:String(error.message||'Knowledge extraction failed')});
 }
}
