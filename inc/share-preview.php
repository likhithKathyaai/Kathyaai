<?php
/**
 * KATHYA share preview helpers.
 * Include from functions.php with: require_once get_template_directory() . '/inc/share-preview.php';
 */
if (!defined('ABSPATH')) exit;
add_action('wp_head', function () {
  if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION')) return;
  $title = is_front_page() ? 'KATHYA AI — Speak. Understand. Act.' : wp_get_document_title();
  $desc = is_front_page()
    ? 'Conversational AI for voice, customer engagement and business workflows. Turn conversations into actions with KATHYA AI.'
    : (has_excerpt() ? get_the_excerpt() : 'Explore KATHYA AI — conversational AI designed to understand intent, connect workflows and turn conversations into action.');
  $desc = wp_strip_all_tags($desc);
  $image = get_template_directory_uri() . '/screenshot.png';
  echo '<meta name="description" content="'.esc_attr($desc).'">'."\n";
  echo '<meta property="og:type" content="website">'."\n";
  echo '<meta property="og:site_name" content="KATHYA AI">'."\n";
  echo '<meta property="og:title" content="'.esc_attr($title).'">'."\n";
  echo '<meta property="og:description" content="'.esc_attr($desc).'">'."\n";
  echo '<meta property="og:url" content="'.esc_url((is_singular()?get_permalink():home_url('/'))).'">'."\n";
  echo '<meta property="og:image" content="'.esc_url($image).'">'."\n";
  echo '<meta name="twitter:card" content="summary_large_image">'."\n";
  echo '<meta name="twitter:title" content="'.esc_attr($title).'">'."\n";
  echo '<meta name="twitter:description" content="'.esc_attr($desc).'">'."\n";
  echo '<meta name="twitter:image" content="'.esc_url($image).'">'."\n";
}, 4);
