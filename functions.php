<?php
if (!defined('ABSPATH')) { exit; }

function kathya_ai_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form','comment-form','comment-list','gallery','caption','style','script'));
    add_theme_support('custom-logo', array('height' => 90, 'width' => 300, 'flex-height' => true, 'flex-width' => true));
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'kathya-ai'),
        'footer'  => __('Footer Menu', 'kathya-ai'),
    ));
}
add_action('after_setup_theme', 'kathya_ai_setup');

function kathya_ai_assets() {
    $version = wp_get_theme()->get('Version');
    wp_enqueue_style('kathya-ai-style', get_stylesheet_uri(), array(), $version);
    wp_enqueue_style('kathya-ai-main', get_theme_file_uri('/assets/css/kathya.css'), array('kathya-ai-style'), $version);
    wp_enqueue_script('kathya-ai-main', get_theme_file_uri('/assets/js/kathya.js'), array(), $version, true);
    wp_localize_script('kathya-ai-main', 'KathyaAssist', array('home' => trailingslashit(home_url('/'))));
}
add_action('wp_enqueue_scripts', 'kathya_ai_assets');

function kathya_ai_customize_register($wp_customize) {
    $wp_customize->add_section('kathya_contact', array(
        'title' => __('KATHYA Contact Details', 'kathya-ai'),
        'priority' => 35,
    ));
    $fields = array(
        'kathya_email' => array('Enquiry Recipient Email', 'likhit@pamedlogtalent.com', 'email'),
        'kathya_phone' => array('Phone', '+1 307-302-6825', 'text'),
        'kathya_demo_url' => array('Demo Button URL', '/demo/', 'url'),
        'kathya_app_url' => array('App / Sign In URL', '/sign-in/', 'url'),
    );
    foreach ($fields as $id => $cfg) {
        $wp_customize->add_setting($id, array('default'=>$cfg[1], 'sanitize_callback'=>$cfg[2] === 'email' ? 'sanitize_email' : ($cfg[2] === 'url' ? 'esc_url_raw' : 'sanitize_text_field')));
        $wp_customize->add_control($id, array('label'=>__($cfg[0], 'kathya-ai'), 'section'=>'kathya_contact', 'type'=>$cfg[2]));
    }
}
add_action('customize_register', 'kathya_ai_customize_register');

function kathya_ai_brand_logo() {
    if (has_custom_logo()) {
        return get_custom_logo();
    }
    $mark = esc_url(get_theme_file_uri('/assets/images/kathya-mark.png'));
    return '<a class="brand" href="'.esc_url(home_url('/')).'"><img src="'.$mark.'" alt="KATHYA AI"><span>KATHYA <b>AI</b></span></a>';
}

function kathya_ai_menu_fallback() {
    echo '<ul class="k-menu">';
    echo '<li><a href="'.esc_url(home_url('/#product')).'">Product</a></li>';
    echo '<li><a href="'.esc_url(home_url('/solutions/')).'">Solutions</a></li>';
    echo '<li><a href="'.esc_url(home_url('/#industries')).'">Industries</a></li>';
    echo '<li><a href="'.esc_url(home_url('/pricing/')).'">Pricing</a></li>';
    echo '<li><a href="'.esc_url(home_url('/about/')).'">Company</a></li>';
    echo '</ul>';
}

function kathya_ai_handle_demo_form() {
    if (kathya_ai_v2_honeypot_failed()) { wp_die(esc_html__('Invalid submission.', 'kathya-ai')); }
    if (!isset($_POST['kathya_demo_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['kathya_demo_nonce'])), 'kathya_demo_submit')) {
        wp_die(esc_html__('Security check failed.', 'kathya-ai'));
    }
    $name = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));
    $email = sanitize_email(wp_unslash($_POST['email'] ?? ''));
    $phone = sanitize_text_field(wp_unslash($_POST['phone'] ?? ''));
    $company = sanitize_text_field(wp_unslash($_POST['company'] ?? ''));
    $agent = sanitize_text_field(wp_unslash($_POST['agent'] ?? ''));
    $language = sanitize_text_field(wp_unslash($_POST['language'] ?? ''));
    $consent = !empty($_POST['consent']) ? 'Yes' : 'No';

    if (!$name || !$email || !$phone || $consent !== 'Yes') {
        wp_safe_redirect(add_query_arg('demo','missing', wp_get_referer() ?: home_url('/demo/'))); exit;
    }

    $to = get_theme_mod('kathya_email', get_option('admin_email'));
    if (!is_email($to)) { $to = get_option('admin_email'); }
    $subject = 'KATHYA AI Demo Request — '.$name;
    $message = "Name: {$name}\nEmail: {$email}\nPhone: {$phone}\nCompany: {$company}\nAgent: {$agent}\nLanguage: {$language}\nConsent to be contacted: {$consent}\n";
    $headers = array('Reply-To: '.$name.' <'.$email.'>');
    $sent = wp_mail($to, $subject, $message, $headers);
    if ($sent) {
        $ack_subject = 'We received your KATHYA AI demo request';
        $ack_message = "Hi {$name},\n\nThank you for contacting KATHYA AI. We received your demo request and our team will follow up with you.\n\nKATHYA AI\nSpeak. Understand. Act.\nA technology product by PA MedLog Talent LLC";
        wp_mail($email, $ack_subject, $ack_message);
    }
    wp_safe_redirect(add_query_arg('demo', $sent ? 'success' : 'email-error', wp_get_referer() ?: home_url('/demo/'))); exit;
}
add_action('admin_post_nopriv_kathya_demo', 'kathya_ai_handle_demo_form');
add_action('admin_post_kathya_demo', 'kathya_ai_handle_demo_form');

function kathya_ai_handle_contact_form() {
    if (kathya_ai_v2_honeypot_failed()) { wp_die(esc_html__('Invalid submission.', 'kathya-ai')); }
    if (!isset($_POST['kathya_contact_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['kathya_contact_nonce'])), 'kathya_contact_submit')) {
        wp_die(esc_html__('Security check failed.', 'kathya-ai'));
    }
    $name = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));
    $email = sanitize_email(wp_unslash($_POST['email'] ?? ''));
    $company = sanitize_text_field(wp_unslash($_POST['company'] ?? ''));
    $message_in = sanitize_textarea_field(wp_unslash($_POST['message'] ?? ''));
    if (!$name || !$email || !$message_in) {
        wp_safe_redirect(add_query_arg('contact','missing', wp_get_referer() ?: home_url('/contact/'))); exit;
    }
    $to = get_theme_mod('kathya_email', get_option('admin_email'));
    if (!is_email($to)) { $to = get_option('admin_email'); }
    $subject = 'KATHYA AI Website Inquiry — '.$name;
    $message = "Name: {$name}\nEmail: {$email}\nCompany: {$company}\n\nMessage:\n{$message_in}\n";
    $headers = array('Reply-To: '.$name.' <'.$email.'>');
    $sent = wp_mail($to, $subject, $message, $headers);
    if ($sent) {
        $ack_subject = 'We received your KATHYA AI enquiry';
        $ack_message = "Hi {$name},\n\nThank you for contacting KATHYA AI. Your enquiry has been received. Our team will follow up with you shortly.\n\nKATHYA AI\nSpeak. Understand. Act.\nA technology product by PA MedLog Talent LLC";
        wp_mail($email, $ack_subject, $ack_message);
    }
    wp_safe_redirect(add_query_arg('contact', $sent ? 'success' : 'email-error', wp_get_referer() ?: home_url('/contact/'))); exit;
}
add_action('admin_post_nopriv_kathya_contact', 'kathya_ai_handle_contact_form');
add_action('admin_post_kathya_contact', 'kathya_ai_handle_contact_form');

/* --- KATHYA AI V2: SEO, security, performance and accessibility --- */
function kathya_ai_v2_resource_hints($urls, $relation_type) {
    if ('preconnect' === $relation_type) { return $urls; }
    return $urls;
}
add_filter('wp_resource_hints', 'kathya_ai_v2_resource_hints', 10, 2);

function kathya_ai_v2_security_headers() {
    if (headers_sent()) return;
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(self), geolocation=()');
    if (is_ssl()) header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}
add_action('send_headers', 'kathya_ai_v2_security_headers');

function kathya_ai_v2_disable_generator() { return ''; }
add_filter('the_generator', 'kathya_ai_v2_disable_generator');
remove_action('wp_head', 'wp_generator');

function kathya_ai_v2_meta_description() {
    if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION')) return;
    $desc = '';
    if (is_front_page()) $desc = 'KATHYA AI by PA MedLog Talent LLC helps businesses build multilingual conversational AI agents that understand intent, automate workflows and take action.';
    elseif (is_singular()) {
        $desc = get_the_excerpt();
        if (!$desc) $desc = wp_strip_all_tags(get_the_content());
        $desc = wp_trim_words($desc, 28, '');
    }
    if ($desc) echo '<meta name="description" content="'.esc_attr($desc).'">' . "\n";
}
add_action('wp_head', 'kathya_ai_v2_meta_description', 2);

function kathya_ai_v2_open_graph() {
    if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION')) return;
    $title = wp_get_document_title();
    $url = is_singular() ? get_permalink() : home_url('/');
    echo '<meta property="og:type" content="website">' . "\n";
    echo '<meta property="og:site_name" content="KATHYA AI">' . "\n";
    echo '<meta property="og:title" content="'.esc_attr($title).'">' . "\n";
    echo '<meta property="og:url" content="'.esc_url($url).'">' . "\n";
    echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
}
add_action('wp_head', 'kathya_ai_v2_open_graph', 3);

function kathya_ai_v2_schema() {
    if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION')) return;
    if (!is_front_page()) return;
    $schema = array(
      '@context' => 'https://schema.org', '@type' => 'Organization',
      'name' => 'KATHYA AI', 'url' => home_url('/'),
      'description' => 'Conversational AI technology product by PA MedLog Talent LLC.',
      'parentOrganization' => array('@type'=>'Organization','name'=>'PA MedLog Talent LLC')
    );
    echo '<script type="application/ld+json">'.wp_json_encode($schema, JSON_UNESCAPED_SLASHES).'</script>' . "\n";
}
add_action('wp_head', 'kathya_ai_v2_schema', 20);

function kathya_ai_v2_body_class($classes) { $classes[] = 'kathya-v2'; return $classes; }
add_filter('body_class', 'kathya_ai_v2_body_class');

function kathya_ai_v2_excerpt_length($length) { return 24; }
add_filter('excerpt_length', 'kathya_ai_v2_excerpt_length', 99);

function kathya_ai_v2_honeypot_failed() {
    return !empty($_POST['website']);
}

/* --- KATHYA AI V3: Appointments, confirmations and reminders --- */
function kathya_ai_v3_register_appointments() {
    register_post_type('kathya_appointment', array(
        'labels'=>array('name'=>'Appointments','singular_name'=>'Appointment','menu_name'=>'KATHYA Appointments'),
        'public'=>false,'show_ui'=>true,'show_in_menu'=>true,'menu_icon'=>'dashicons-calendar-alt',
        'supports'=>array('title'),'capability_type'=>'post','map_meta_cap'=>true
    ));
}
add_action('init','kathya_ai_v3_register_appointments');

function kathya_ai_v3_customize($wp_customize) {
    $wp_customize->add_section('kathya_booking', array('title'=>'KATHYA Booking & Notifications','priority'=>36));
    $settings = array(
      'kathya_booking_timezone'=>array('Booking Timezone','America/New_York','text'),
      'kathya_booking_start'=>array('Business Day Starts','09:00','text'),
      'kathya_booking_end'=>array('Business Day Ends','17:00','text'),
      'kathya_booking_duration'=>array('Default Duration (minutes)','30','number'),
      'kathya_whatsapp_webhook'=>array('WhatsApp Webhook URL (optional)','','url'),
      'kathya_whatsapp_token'=>array('WhatsApp Webhook Token (optional)','','text'),
      'kathya_calendar_note'=>array('Calendar Integration Note','Connect Google/Microsoft Calendar through your automation or API layer.','text'),
    );
    foreach($settings as $id=>$cfg){
      $wp_customize->add_setting($id,array('default'=>$cfg[1],'sanitize_callback'=>$cfg[2]==='url'?'esc_url_raw':'sanitize_text_field'));
      $wp_customize->add_control($id,array('label'=>$cfg[0],'section'=>'kathya_booking','type'=>$cfg[2]));
    }
}
add_action('customize_register','kathya_ai_v3_customize');

function kathya_ai_v3_slots($date='') {
    $tzname = get_theme_mod('kathya_booking_timezone','America/New_York');
    try { $tz = new DateTimeZone($tzname); } catch(Exception $e){ $tz = wp_timezone(); }
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/',$date) ? $date : (new DateTime('now',$tz))->format('Y-m-d');
    $start = get_theme_mod('kathya_booking_start','09:00');
    $end = get_theme_mod('kathya_booking_end','17:00');
    $duration = max(15, min(240, intval(get_theme_mod('kathya_booking_duration','30'))));
    $from = DateTime::createFromFormat('Y-m-d H:i',$date.' '.$start,$tz);
    $to = DateTime::createFromFormat('Y-m-d H:i',$date.' '.$end,$tz);
    if(!$from || !$to || $from >= $to) return array();
    $slots=array();
    for($t=clone $from; $t < $to; $t->modify('+'.$duration.' minutes')){
      $slot=$t->format('Y-m-d H:i');
      $existing=get_posts(array('post_type'=>'kathya_appointment','post_status'=>'publish','numberposts'=>1,'meta_query'=>array(array('key'=>'_kathya_slot','value'=>$slot))));
      if(!$existing) $slots[]=$t->format('H:i');
    }
    return $slots;
}

function kathya_ai_v3_ajax_slots(){
    check_ajax_referer('kathya_booking_slots','nonce');
    $date=sanitize_text_field(wp_unslash($_POST['date']??''));
    wp_send_json_success(array('slots'=>kathya_ai_v3_slots($date)));
}
add_action('wp_ajax_nopriv_kathya_slots','kathya_ai_v3_ajax_slots');
add_action('wp_ajax_kathya_slots','kathya_ai_v3_ajax_slots');

function kathya_ai_v3_whatsapp_notify($appointment_id,$type='confirmation'){
    $url=get_theme_mod('kathya_whatsapp_webhook',''); if(!$url) return false;
    $payload=array(
      'event'=>$type,'appointment_id'=>$appointment_id,
      'name'=>get_post_meta($appointment_id,'_kathya_name',true),
      'phone'=>get_post_meta($appointment_id,'_kathya_phone',true),
      'email'=>get_post_meta($appointment_id,'_kathya_email',true),
      'service'=>get_post_meta($appointment_id,'_kathya_service',true),
      'slot'=>get_post_meta($appointment_id,'_kathya_slot',true),
      'manage_url'=>add_query_arg(array('appt'=>get_post_meta($appointment_id,'_kathya_token',true)),home_url('/manage-appointment/'))
    );
    $headers=array('Content-Type'=>'application/json');
    $token=get_theme_mod('kathya_whatsapp_token',''); if($token) $headers['Authorization']='Bearer '.$token;
    return wp_remote_post($url,array('timeout'=>8,'headers'=>$headers,'body'=>wp_json_encode($payload)));
}

function kathya_ai_v3_send_email($id,$type='confirmation'){
    $email=get_post_meta($id,'_kathya_email',true); if(!is_email($email)) return false;
    $name=get_post_meta($id,'_kathya_name',true); $service=get_post_meta($id,'_kathya_service',true); $slot=get_post_meta($id,'_kathya_slot',true);
    $token=get_post_meta($id,'_kathya_token',true); $manage=add_query_arg('appt',$token,home_url('/manage-appointment/'));
    $titles=array('confirmation'=>'Appointment confirmed','rescheduled'=>'Appointment rescheduled','cancelled'=>'Appointment cancelled','reminder'=>'Appointment reminder');
    $subject='KATHYA AI — '.($titles[$type]??'Appointment update');
    $body="Hello {$name},\n\n".($titles[$type]??'Appointment update').".\n\nService: {$service}\nDate & time: {$slot}\n\nManage appointment: {$manage}\n\nKATHYA AI\nSpeak. Understand. Act.\nA technology product by PA MedLog Talent LLC.";
    return wp_mail($email,$subject,$body);
}

function kathya_ai_v3_handle_booking(){
    if(kathya_ai_v2_honeypot_failed()) wp_die('Invalid submission.');
    if(!isset($_POST['kathya_booking_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['kathya_booking_nonce'])),'kathya_booking_submit')) wp_die('Security check failed.');
    $name=sanitize_text_field(wp_unslash($_POST['name']??'')); $email=sanitize_email(wp_unslash($_POST['email']??''));
    $phone=sanitize_text_field(wp_unslash($_POST['phone']??'')); $service=sanitize_text_field(wp_unslash($_POST['service']??''));
    $date=sanitize_text_field(wp_unslash($_POST['date']??'')); $time=sanitize_text_field(wp_unslash($_POST['time']??''));
    $notify=sanitize_text_field(wp_unslash($_POST['notify']??'email')); $consent=!empty($_POST['consent']);
    if(!$name || !is_email($email) || !$phone || !$service || !$date || !$time || !$consent){ wp_safe_redirect(add_query_arg('booking','missing',home_url('/book-appointment/'))); exit; }
    if(!in_array($time,kathya_ai_v3_slots($date),true)){ wp_safe_redirect(add_query_arg('booking','unavailable',home_url('/book-appointment/'))); exit; }
    $slot=$date.' '.$time; $token=wp_generate_password(32,false,false);
    $id=wp_insert_post(array('post_type'=>'kathya_appointment','post_status'=>'publish','post_title'=>$name.' — '.$slot));
    if(is_wp_error($id)){ wp_safe_redirect(add_query_arg('booking','error',home_url('/book-appointment/'))); exit; }
    foreach(array('name'=>$name,'email'=>$email,'phone'=>$phone,'service'=>$service,'slot'=>$slot,'notify'=>$notify,'token'=>$token,'status'=>'confirmed') as $k=>$v) update_post_meta($id,'_kathya_'.$k,$v);
    if(in_array($notify,array('email','both'),true)) kathya_ai_v3_send_email($id,'confirmation');
    if(in_array($notify,array('whatsapp','both'),true)) kathya_ai_v3_whatsapp_notify($id,'confirmation');
    $admin=get_theme_mod('kathya_email',get_option('admin_email')); wp_mail($admin,'New KATHYA appointment — '.$name,"Service: {$service}\nSlot: {$slot}\nEmail: {$email}\nPhone: {$phone}");
    wp_safe_redirect(add_query_arg(array('booking'=>'success','appt'=>$token),home_url('/booking-confirmation/'))); exit;
}
add_action('admin_post_nopriv_kathya_booking','kathya_ai_v3_handle_booking');
add_action('admin_post_kathya_booking','kathya_ai_v3_handle_booking');

function kathya_ai_v3_find_by_token($token){
    if(!$token) return 0; $posts=get_posts(array('post_type'=>'kathya_appointment','post_status'=>'publish','numberposts'=>1,'meta_query'=>array(array('key'=>'_kathya_token','value'=>$token))));
    return $posts ? $posts[0]->ID : 0;
}

function kathya_ai_v3_handle_manage(){
    if(!isset($_POST['kathya_manage_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['kathya_manage_nonce'])),'kathya_manage_submit')) wp_die('Security check failed.');
    $token=sanitize_text_field(wp_unslash($_POST['token']??'')); $id=kathya_ai_v3_find_by_token($token); if(!$id) wp_die('Appointment not found.');
    $action=sanitize_text_field(wp_unslash($_POST['appointment_action']??''));
    if($action==='cancel'){
      update_post_meta($id,'_kathya_status','cancelled'); kathya_ai_v3_send_email($id,'cancelled'); kathya_ai_v3_whatsapp_notify($id,'cancelled');
      wp_safe_redirect(add_query_arg(array('appt'=>$token,'updated'=>'cancelled'),home_url('/manage-appointment/'))); exit;
    }
    if($action==='reschedule'){
      $date=sanitize_text_field(wp_unslash($_POST['date']??'')); $time=sanitize_text_field(wp_unslash($_POST['time']??''));
      if(!in_array($time,kathya_ai_v3_slots($date),true)){ wp_safe_redirect(add_query_arg(array('appt'=>$token,'updated'=>'unavailable'),home_url('/manage-appointment/'))); exit; }
      update_post_meta($id,'_kathya_slot',$date.' '.$time); update_post_meta($id,'_kathya_status','confirmed');
      kathya_ai_v3_send_email($id,'rescheduled'); kathya_ai_v3_whatsapp_notify($id,'rescheduled');
      wp_safe_redirect(add_query_arg(array('appt'=>$token,'updated'=>'rescheduled'),home_url('/manage-appointment/'))); exit;
    }
}
add_action('admin_post_nopriv_kathya_manage_appointment','kathya_ai_v3_handle_manage');
add_action('admin_post_kathya_manage_appointment','kathya_ai_v3_handle_manage');

function kathya_ai_v3_ics(){
    if(empty($_GET['kathya_ics'])) return; $token=sanitize_text_field(wp_unslash($_GET['kathya_ics'])); $id=kathya_ai_v3_find_by_token($token); if(!$id) return;
    $slot=get_post_meta($id,'_kathya_slot',true); $service=get_post_meta($id,'_kathya_service',true); $duration=max(15,intval(get_theme_mod('kathya_booking_duration','30')));
    try{$tz=new DateTimeZone(get_theme_mod('kathya_booking_timezone','America/New_York'));}catch(Exception $e){$tz=wp_timezone();}
    $start=DateTime::createFromFormat('Y-m-d H:i',$slot,$tz); if(!$start) return; $end=clone $start; $end->modify('+'.$duration.' minutes');
    header('Content-Type: text/calendar; charset=utf-8'); header('Content-Disposition: attachment; filename="kathya-appointment.ics"');
    echo "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//KATHYA AI//Appointments//EN\r\nBEGIN:VEVENT\r\nUID:".esc_html($token)."@kathyaai.com\r\nDTSTAMP:".gmdate('Ymd\\THis\\Z')."\r\nDTSTART:".$start->setTimezone(new DateTimeZone('UTC'))->format('Ymd\\THis\\Z')."\r\nDTEND:".$end->setTimezone(new DateTimeZone('UTC'))->format('Ymd\\THis\\Z')."\r\nSUMMARY:".esc_html($service)." - KATHYA AI\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"; exit;
}
add_action('template_redirect','kathya_ai_v3_ics');

function kathya_ai_v3_admin_columns($cols){ return array('cb'=>$cols['cb'],'title'=>'Appointment','service'=>'Service','slot'=>'Date & Time','status'=>'Status','notify'=>'Notification','date'=>'Created'); }
add_filter('manage_kathya_appointment_posts_columns','kathya_ai_v3_admin_columns');
function kathya_ai_v3_admin_column($col,$id){ if(in_array($col,array('service','slot','status','notify'),true)) echo esc_html(get_post_meta($id,'_kathya_'.$col,true)); }
add_action('manage_kathya_appointment_posts_custom_column','kathya_ai_v3_admin_column',10,2);

/* --- KATHYA AI V4: launch experience helpers --- */
function kathya_ai_v4_menu_fallback() {
    echo '<ul class="k-menu">';
    $items=array('Platform'=>'/#platform','Solutions'=>'/solutions/','Industries'=>'/industries/','Integrations'=>'/integrations/','Pricing'=>'/pricing/','Developers'=>'/developers/','Resources'=>'/resources/','Company'=>'/about/');
    foreach($items as $label=>$path) echo '<li><a href="'.esc_url(home_url($path)).'">'.esc_html($label).'</a></li>';
    echo '</ul>';
}

function kathya_ai_v4_faq_schema(){
    if (!is_front_page() || defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION')) return;
    $faqs=array(
      array('q'=>'What is KATHYA AI?','a'=>'KATHYA AI is a conversational AI platform designed to help businesses create voice agents that understand customer intent and take connected business actions.'),
      array('q'=>'Can KATHYA book appointments?','a'=>'KATHYA can be connected to appointment and calendar workflows to check availability, book time slots, and trigger confirmations and reminders.'),
      array('q'=>'Does KATHYA support multiple languages?','a'=>'KATHYA is designed for multilingual experiences. Available languages depend on the speech, voice, and model providers configured in a production deployment.')
    );
    $entities=array(); foreach($faqs as $f){$entities[]=array('@type'=>'Question','name'=>$f['q'],'acceptedAnswer'=>array('@type'=>'Answer','text'=>$f['a']));}
    echo '<script type="application/ld+json">'.wp_json_encode(array('@context'=>'https://schema.org','@type'=>'FAQPage','mainEntity'=>$entities),JSON_UNESCAPED_SLASHES).'</script>';
}
add_action('wp_head','kathya_ai_v4_faq_schema',21);

/* --- KATHYA AI V5.2: live generative assistant + enquiry diagnostics --- */
function kathya_ai_v52_assistant_config() {
    return array(
        'rest' => esc_url_raw(rest_url('kathya/v1/assistant')),
        'nonce' => wp_create_nonce('wp_rest'),
        'configured' => defined('KATHYA_OPENAI_API_KEY') && (bool) KATHYA_OPENAI_API_KEY,
    );
}
function kathya_ai_v52_localize() {
    wp_localize_script('kathya-ai-main', 'KathyaLiveAI', kathya_ai_v52_assistant_config());
}
add_action('wp_enqueue_scripts', 'kathya_ai_v52_localize', 30);

function kathya_ai_v52_rate_key() {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
    return 'kathya_ai_rate_' . md5($ip);
}
function kathya_ai_v52_assistant_permission(WP_REST_Request $request) {
    $nonce = $request->get_header('X-WP-Nonce');
    return $nonce && wp_verify_nonce($nonce, 'wp_rest');
}
function kathya_ai_v52_register_rest() {
    register_rest_route('kathya/v1', '/assistant', array(
        'methods' => 'POST',
        'callback' => 'kathya_ai_v52_assistant_response',
        'permission_callback' => 'kathya_ai_v52_assistant_permission',
    ));
}
add_action('rest_api_init', 'kathya_ai_v52_register_rest');

function kathya_ai_v52_extract_output($data) {
    if (!empty($data['output_text']) && is_string($data['output_text'])) return $data['output_text'];
    if (!empty($data['output']) && is_array($data['output'])) {
        foreach ($data['output'] as $item) {
            if (empty($item['content']) || !is_array($item['content'])) continue;
            foreach ($item['content'] as $content) {
                if (($content['type'] ?? '') === 'output_text' && !empty($content['text'])) return $content['text'];
            }
        }
    }
    return '';
}
function kathya_ai_v52_assistant_response(WP_REST_Request $request) {
    if (!defined('KATHYA_OPENAI_API_KEY') || !KATHYA_OPENAI_API_KEY) {
        return new WP_Error('not_configured', 'Live AI is not configured yet. Please use Contact or Book a Demo.', array('status'=>503));
    }
    $rate_key = kathya_ai_v52_rate_key();
    $count = (int) get_transient($rate_key);
    if ($count >= 20) return new WP_Error('rate_limited', 'Please wait a few minutes before sending more messages.', array('status'=>429));
    set_transient($rate_key, $count + 1, 10 * MINUTE_IN_SECONDS);

    $json = $request->get_json_params();
    $message = sanitize_textarea_field($json['message'] ?? '');
    $history = isset($json['history']) && is_array($json['history']) ? array_slice($json['history'], -8) : array();
    if (!$message || mb_strlen($message) > 1200) return new WP_Error('bad_message', 'Please enter a shorter message.', array('status'=>400));

    $conversation = '';
    foreach ($history as $turn) {
        $role = ($turn['role'] ?? '') === 'assistant' ? 'KATHYA' : 'Visitor';
        $text = sanitize_textarea_field($turn['content'] ?? '');
        if ($text) $conversation .= $role . ': ' . mb_substr($text, 0, 800) . "\n";
    }
    $conversation .= 'Visitor: ' . $message;
    $instructions = 'You are KATHYA AI, the concise website assistant for KATHYA AI, a technology product by PA MedLog Talent LLC. KATHYA is a conversational AI platform for business voice and customer interaction workflows. Do not mention recruitment, staffing, candidates, ATS, or job placement. Help visitors understand KATHYA, solutions, integrations, pricing, security principles, appointments, and how to contact the team. Never invent certifications, customer results, pricing, integrations, availability, or legal/compliance claims. If a visitor wants a demo or appointment, tell them to use the Book a demo button in this assistant or the Talk to KATHYA button in the header; do not print raw URL paths. If they want a human, tell them to use Contact team; do not print raw URL paths. Do not request passwords, payment card data, government IDs, medical details, or other sensitive information. Prefer 2-5 short sentences. Keep answers under 90 words unless the visitor explicitly asks for more detail.';

    $model = defined('KATHYA_OPENAI_MODEL') && KATHYA_OPENAI_MODEL ? KATHYA_OPENAI_MODEL : 'gpt-5.6-luna';
    $response = wp_remote_post('https://api.openai.com/v1/responses', array(
        'timeout' => 30,
        'headers' => array('Authorization'=>'Bearer '.KATHYA_OPENAI_API_KEY, 'Content-Type'=>'application/json'),
        'body' => wp_json_encode(array('model'=>$model, 'instructions'=>$instructions, 'input'=>$conversation, 'store'=>false, 'max_output_tokens'=>350)),
    ));
    if (is_wp_error($response)) return new WP_Error('ai_unavailable', 'KATHYA is temporarily unavailable. Please try again or contact our team.', array('status'=>502));
    $code = wp_remote_retrieve_response_code($response);
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if ($code < 200 || $code >= 300) {
        if (defined('WP_DEBUG') && WP_DEBUG) error_log('KATHYA AI API error HTTP '.$code); // no secret/body logging
        return new WP_Error('ai_unavailable', 'KATHYA is temporarily unavailable. Please try again or contact our team.', array('status'=>502));
    }
    $text = trim(kathya_ai_v52_extract_output($data));
    if (!$text) return new WP_Error('empty_ai', 'I could not generate a response. Please try again.', array('status'=>502));
    return rest_ensure_response(array('reply'=>wp_strip_all_tags($text)));
}

/* Mail diagnostics: wp_mail success means WordPress handed the message to its mail transport, not inbox delivery. */
function kathya_ai_v52_mail_log($status, $detail='') {
    update_option('kathya_mail_last_status', array('status'=>$status,'detail'=>sanitize_text_field($detail),'time'=>current_time('mysql')), false);
}
add_action('wp_mail_succeeded', function($mail_data){ kathya_ai_v52_mail_log('accepted', 'WordPress mail transport accepted the latest message.'); });
add_action('wp_mail_failed', function($error){ kathya_ai_v52_mail_log('failed', $error->get_error_message()); });

function kathya_ai_v52_admin_menu() {
    add_management_page('KATHYA Diagnostics','KATHYA Diagnostics','manage_options','kathya-diagnostics','kathya_ai_v52_diagnostics_page');
}
add_action('admin_menu','kathya_ai_v52_admin_menu');
function kathya_ai_v52_diagnostics_page() {
    if (!current_user_can('manage_options')) return;
    $recipient = get_theme_mod('kathya_email', get_option('admin_email'));
    if (isset($_POST['kathya_test_mail']) && check_admin_referer('kathya_test_mail_action')) {
        $ok = wp_mail($recipient, 'KATHYA AI email test', "This is a KATHYA AI enquiry-delivery test.\nTime: ".current_time('mysql'));
        echo '<div class="notice '.($ok?'notice-success':'notice-error').' is-dismissible"><p>'.esc_html($ok?'WordPress accepted the test email. Confirm it arrived in the inbox/spam folder.':'WordPress could not hand off the test email. Configure SMTP and retry.').'</p></div>';
    }
    $last = get_option('kathya_mail_last_status', array());
    echo '<div class="wrap"><h1>KATHYA Diagnostics</h1>';
    echo '<table class="widefat striped" style="max-width:850px"><tbody>';
    echo '<tr><th>Enquiry recipient</th><td>'.esc_html($recipient).'</td></tr>';
    echo '<tr><th>Live AI backend</th><td>'.(defined('KATHYA_OPENAI_API_KEY') && KATHYA_OPENAI_API_KEY ? '<strong style="color:green">Configured</strong>' : '<strong style="color:#b32d2e">Not configured</strong>').'</td></tr>';
    echo '<tr><th>AI model</th><td>'.esc_html(defined('KATHYA_OPENAI_MODEL') ? KATHYA_OPENAI_MODEL : 'gpt-5.6-luna').'</td></tr>';
    echo '<tr><th>Last WordPress mail event</th><td>'.esc_html(($last['status'] ?? 'No test yet').' '.($last['time'] ?? '').' '.($last['detail'] ?? '')).'</td></tr>';
    echo '</tbody></table><h2>Email delivery test</h2><p>This sends a real test message to the configured enquiry recipient. A successful WordPress result confirms hand-off only; inbox delivery must be confirmed at the mailbox.</p>';
    echo '<form method="post">'; wp_nonce_field('kathya_test_mail_action'); echo '<input type="hidden" name="kathya_test_mail" value="1"><button class="button button-primary">Send test enquiry email</button></form>';
    echo '<h2>Live AI setup</h2><p>Add the API key server-side in <code>wp-config.php</code>. Never place it in JavaScript or a page builder.</p><pre>define(\'KATHYA_OPENAI_API_KEY\', \'YOUR_SERVER_SIDE_KEY\');\ndefine(\'KATHYA_OPENAI_MODEL\', \'gpt-5.6-luna\');</pre></div>';
}


/* --- KATHYA AI V6: launch routing + social preview --- */
require_once get_template_directory() . '/inc/share-preview.php';

function kathya_ai_v6_virtual_pages($template) {
    if (is_404()) {
        $path = trim((string) wp_parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
        $map = array(
          'solutions'=>'page-solutions.php','industries'=>'page-industries.php','integrations'=>'page-integrations.php',
          'pricing'=>'page-pricing.php','developers'=>'page-developers.php','resources'=>'page-resources.php',
          'about'=>'page-about.php','company'=>'page-about.php','demo'=>'page-demo.php','contact'=>'page-contact.php',
          'book-appointment'=>'page-book-appointment.php','manage-appointment'=>'page-manage-appointment.php',
          'sign-in'=>'page-sign-in.php','get-started'=>'page-get-started.php','booking-confirmation'=>'page-booking-confirmation.php','platform'=>'page-platform.php'
        );
        if (isset($map[$path])) {
            global $wp_query; $wp_query->is_404 = false; status_header(200);
            $candidate = get_template_directory() . '/' . $map[$path];
            if (file_exists($candidate)) return $candidate;
        }
    }
    return $template;
}
add_filter('template_include','kathya_ai_v6_virtual_pages',99);


function kathya_ai_v6_handle_get_started(){
    if(kathya_ai_v2_honeypot_failed()) wp_die('Invalid submission.');
    if(!isset($_POST['kathya_get_started_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['kathya_get_started_nonce'])),'kathya_get_started_submit')) wp_die('Security check failed.');
    $name=sanitize_text_field(wp_unslash($_POST['name']??'')); $email=sanitize_email(wp_unslash($_POST['email']??''));
    $company=sanitize_text_field(wp_unslash($_POST['company']??'')); $phone=sanitize_text_field(wp_unslash($_POST['phone']??''));
    $outcome=sanitize_text_field(wp_unslash($_POST['outcome']??'')); $industry=sanitize_text_field(wp_unslash($_POST['industry']??''));
    $systems=sanitize_text_field(wp_unslash($_POST['systems']??'')); $volume=sanitize_text_field(wp_unslash($_POST['volume']??''));
    $channels=isset($_POST['channels']) && is_array($_POST['channels']) ? array_map('sanitize_text_field',wp_unslash($_POST['channels'])) : array();
    $consent=!empty($_POST['consent']);
    if(!$name || !is_email($email) || !$company || !$outcome || !$industry || !$consent){wp_safe_redirect(add_query_arg('started','missing',home_url('/get-started/')));exit;}
    $to=get_theme_mod('kathya_email',get_option('admin_email')); if(!is_email($to))$to=get_option('admin_email');
    $subject='New KATHYA workspace request — '.$company;
    $body="Name: {$name}\nEmail: {$email}\nPhone: {$phone}\nCompany: {$company}\nOutcome: {$outcome}\nIndustry: {$industry}\nChannels: ".implode(', ',$channels)."\nSystems: {$systems}\nVolume: {$volume}\n";
    $sent=wp_mail($to,$subject,$body,array('Reply-To: '.$name.' <'.$email.'>'));
    if($sent) wp_mail($email,'Your KATHYA blueprint request',"Hi {$name},\n\nWe received your KATHYA workspace request for {$outcome}. Our team will review the workflow and follow up with you.\n\nKATHYA AI\nSpeak. Understand. Act.");
    wp_safe_redirect(add_query_arg('started',$sent?'success':'email-error',home_url('/get-started/')));exit;
}
add_action('admin_post_nopriv_kathya_get_started','kathya_ai_v6_handle_get_started');
add_action('admin_post_kathya_get_started','kathya_ai_v6_handle_get_started');
