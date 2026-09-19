<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header">
  <div class="k-container nav-wrap">
    <div class="logo-wrap"><?php echo wp_kses_post(kathya_ai_brand_logo()); ?></div>
    <button class="menu-toggle" aria-expanded="false" aria-controls="primary-menu" aria-label="Toggle navigation"><span></span><span></span><span></span></button>
    <nav id="primary-menu" class="primary-nav" aria-label="Primary navigation">
      <?php wp_nav_menu(array('theme_location'=>'primary','container'=>false,'menu_class'=>'k-menu','fallback_cb'=>'kathya_ai_menu_fallback')); ?>
      <div class="nav-actions">
        <a class="nav-login" href="<?php echo esc_url(get_theme_mod('kathya_app_url','#')); ?>">Sign in</a>
        <a class="k-btn k-btn-primary k-btn-small" href="<?php echo esc_url(get_theme_mod('kathya_demo_url','/demo/')); ?>">Talk to KATHYA</a>
      </div>
    </nav>
  </div>
</header>
