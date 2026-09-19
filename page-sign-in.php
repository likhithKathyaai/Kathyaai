<?php /* Template Name: KATHYA Sign In */ get_header(); ?>
<main id="main-content" class="auth-page">
<section class="auth-shell"><div class="k-container auth-grid">
  <div class="auth-copy"><span class="eyebrow">KATHYA WORKSPACE</span><h1>Your AI operations workspace.</h1><p>Sign in to manage KATHYA agents, conversations, workflows and analytics.</p>
    <div class="auth-points"><span>✓ Agent management</span><span>✓ Conversation intelligence</span><span>✓ Workflow controls</span><span>✓ Business outcomes</span></div>
    <div class="auth-new"><small>NEW TO KATHYA?</small><h2>Start with a workspace request.</h2><p>Tell us what you want KATHYA to handle. We’ll map the right setup for your business.</p><a class="k-btn k-btn-ghost" href="<?php echo esc_url(home_url('/get-started/')); ?>">Create a KATHYA workspace →</a></div>
  </div>
  <div class="auth-card">
  <?php if (is_user_logged_in()): $u=wp_get_current_user(); ?>
    <span class="auth-status">● SIGNED IN</span><h2>Welcome, <?php echo esc_html($u->display_name ?: $u->user_login); ?>.</h2><p>Continue to your current WordPress workspace.</p>
    <a class="k-btn k-btn-primary auth-full" href="<?php echo esc_url(admin_url()); ?>">Open workspace →</a><a class="auth-link" href="<?php echo esc_url(wp_logout_url(home_url('/'))); ?>">Sign out</a>
  <?php else: ?>
    <span class="auth-status">● SECURE ACCESS</span><h2>Sign in</h2><p>For existing authorized KATHYA accounts.</p>
    <?php wp_login_form(array('redirect'=>home_url('/sign-in/'),'remember'=>true,'label_username'=>'Email or username','label_password'=>'Password','label_remember'=>'Keep me signed in','label_log_in'=>'Sign in →')); ?>
    <div class="auth-row"><a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Forgot password?</a><a href="<?php echo esc_url(home_url('/get-started/')); ?>">New user? Get started</a></div>
    <div class="auth-disclaimer">Customer SaaS accounts will use the dedicated KATHYA app as the production workspace is launched.</div>
  <?php endif; ?>
  </div>
</div></section></main><?php get_footer(); ?>