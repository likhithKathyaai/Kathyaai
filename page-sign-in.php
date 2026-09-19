<?php /* Template Name: KATHYA Sign In */ get_header(); ?>
<main id="main-content">
<section class="page-hero compact"><div class="k-container"><span class="eyebrow">KATHYA WORKSPACE</span><h1>Sign in to KATHYA.</h1><p>Access your agents, conversations, workflows and analytics.</p></div></section>
<section class="k-section"><div class="k-container" style="max-width:620px"><div class="k-card">
<?php if (is_user_logged_in()): $u=wp_get_current_user(); ?>
<h2>Welcome back, <?php echo esc_html($u->display_name ?: $u->user_login); ?>.</h2><p>You are signed in to the website workspace.</p>
<a class="k-btn k-btn-primary" href="<?php echo esc_url(admin_url()); ?>">Open workspace</a>
<a class="k-btn k-btn-ghost" href="<?php echo esc_url(wp_logout_url(home_url('/'))); ?>">Sign out</a>
<?php else: ?>
<h2>Workspace access</h2><p>Use your authorized KATHYA account. Customer SaaS access will move to the dedicated app as the platform launches.</p>
<?php wp_login_form(array('redirect'=>home_url('/sign-in/'),'remember'=>true)); ?>
<p style="margin-top:18px"><a class="text-link" href="<?php echo esc_url(wp_lostpassword_url()); ?>">Forgot password?</a></p>
<?php endif; ?>
</div></div></section></main><?php get_footer(); ?>