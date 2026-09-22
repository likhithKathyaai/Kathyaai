<footer class="site-footer">
  <div class="k-container footer-grid">
    <div>
      <div class="footer-brand">KATHYA <b>AI</b></div>
      <p>Conversational AI that speaks naturally, understands intent and turns customer conversations into business actions.</p>
      <p class="footer-motto">Speak. Understand. Act.</p>
    </div>
    <div><h4>Product</h4><a href="<?php echo esc_url(home_url('/solutions/')); ?>">Solutions</a><a href="<?php echo esc_url(home_url('/pricing/')); ?>">Pricing</a><a href="<?php echo esc_url(home_url('/demo/')); ?>">Demo</a></div>
    <div><h4>Company</h4><a href="<?php echo esc_url(home_url('/about/')); ?>">About</a><a href="<?php echo esc_url(home_url('/contact/')); ?>">Contact</a><a href="<?php echo esc_url(home_url('/#industries')); ?>">Industries</a></div>
    <div><h4>Legal</h4><a href="<?php echo esc_url(home_url('/privacy-policy/')); ?>">Privacy</a><a href="<?php echo esc_url(home_url('/terms/')); ?>">Terms</a><a href="<?php echo esc_url(home_url('/cookie-policy/')); ?>">Cookies</a></div>
  </div>
  <div class="k-container footer-bottom">© <?php echo esc_html(date('Y')); ?> PA MedLog Talent LLC. KATHYA AI. All rights reserved. <span>Born from language. Built with intelligence. Made for the world.</span></div>
</footer>
<div class="k-assist" id="k-assist">
  <button class="k-assist-launch" id="k-assist-launch" aria-label="Open KATHYA AI assistant" aria-expanded="false"><span class="k-assist-pulse"></span><span class="k-assist-mark">K</span><span class="k-assist-launch-text">Ask KATHYA</span></button>
  <section class="k-assist-panel" id="k-assist-panel" aria-label="KATHYA AI website assistant" aria-hidden="true">
    <header><div class="k-assist-avatar">K</div><div><strong>KATHYA AI</strong><small><i></i> AI assistance</small></div><button id="k-assist-close" aria-label="Close assistant">×</button></header>
    <div class="k-assist-body" id="k-assist-body"><div class="k-assist-msg ai"><span>K</span><p>Hi — I’m KATHYA. How can I help you today?</p></div><div class="k-assist-quick"><button data-q="demo">Book a demo</button><button data-q="solutions">Explore solutions</button><button data-q="pricing">Pricing</button><button data-q="contact">Contact team</button></div></div>
    <form class="k-assist-form" id="k-assist-form"><label class="screen-reader-text" for="k-assist-input">Ask KATHYA</label><input id="k-assist-input" autocomplete="off" placeholder="Ask about KATHYA…"><button aria-label="Send message">↑</button></form>
    <div class="k-assist-note">Live generative AI · Do not share sensitive information</div>
  </section>
</div>
<?php wp_footer(); ?>
</body></html>
