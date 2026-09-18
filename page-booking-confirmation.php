<?php /* Template Name: Booking Confirmation */ get_header(); $token=sanitize_text_field(wp_unslash($_GET['appt']??'')); $id=kathya_ai_v3_find_by_token($token); ?>
<main class="k-page"><section class="k-section"><div class="k-container k-narrow k-center">
<?php if($id): $slot=get_post_meta($id,'_kathya_slot',true); $service=get_post_meta($id,'_kathya_service',true); ?>
<div class="k-success-icon">✓</div><div class="k-eyebrow">Confirmed</div><h1 class="k-title">Your appointment is booked.</h1><div class="k-confirm-card"><strong><?php echo esc_html($service); ?></strong><span><?php echo esc_html($slot); ?></span><span><?php echo esc_html(get_theme_mod('kathya_booking_timezone','America/New_York')); ?></span></div>
<div class="k-actions"><a class="k-btn k-btn-primary" href="<?php echo esc_url(add_query_arg('kathya_ics',$token,home_url('/'))); ?>">Add to Calendar</a><a class="k-btn k-btn-outline" href="<?php echo esc_url(add_query_arg('appt',$token,home_url('/manage-appointment/'))); ?>">Reschedule / Cancel</a></div>
<p class="k-muted">A confirmation has been sent using your selected notification channel.</p>
<?php else: ?><h1 class="k-title">Appointment not found.</h1><?php endif; ?>
</div></section></main><?php get_footer(); ?>
