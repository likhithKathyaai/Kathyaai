<?php
if (!defined('ABSPATH')) exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width,initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="site-header">
  <div class="k-container nav-wrap">
    <a class="brand" href="<?php echo esc_url(home_url('/')); ?>" aria-label="KATHYA AI home">
      <?php if (has_custom_logo()) { the_custom_logo(); } else { ?>
        <img src="<?php echo esc_url(get_template_directory_uri().'/assets/images/kathya-mark.png'); ?>" alt="KATHYA AI">
        <span>KATHYA <b>AI</b></span>
      <?php } ?>
    </a>
    <button class="menu-toggle" aria-label="Open menu"><span></span><span></span><span></span></button>
    <nav class="primary-nav" aria-label="Primary">
      <a href="<?php echo esc_url(home_url('/platform/')); ?>">Product</a>
      <a href="<?php echo esc_url(home_url('/solutions/')); ?>">Solutions</a>
      <a href="<?php echo esc_url(home_url('/industries/')); ?>">Industries</a>
      <a href="<?php echo esc_url(home_url('/integrations/')); ?>">Integrations</a>
      <a href="<?php echo esc_url(home_url('/pricing/')); ?>">Pricing</a>
      <a href="<?php echo esc_url(home_url('/developers/')); ?>">Developers</a>
      <a href="<?php echo esc_url(home_url('/resources/')); ?>">Resources</a>
    </nav>
    <div class="nav-actions">
      <a class="nav-login" href="<?php echo esc_url(home_url('/sign-in/')); ?>">Sign in</a>
      <a class="k-btn k-btn-primary k-btn-small" href="<?php echo esc_url(home_url('/demo/')); ?>">Talk to KATHYA</a>
    </div>
  </div>
</header>