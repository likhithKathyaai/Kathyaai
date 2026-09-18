<?php /* Template Name: Manage Appointment */ get_header(); $token=sanitize_text_field(wp_unslash($_GET['appt']??'')); $id=kathya_ai_v3_find_by_token($token); $tz=get_theme_mod('kathya_booking_timezone','America/New_York'); $today=(new DateTime('now',new DateTimeZone($tz)))->format('Y-m-d'); ?>
<main class="k-page"><section class="k-section"><div class="k-container k-narrow">
<div class="k-eyebrow">Appointment</div><h1 class="k-title">Manage your booking.</h1>
<?php if($id): ?><div class="k-confirm-card"><strong><?php echo esc_html(get_post_meta($id,'_kathya_service',true)); ?></strong><span><?php echo esc_html(get_post_meta($id,'_kathya_slot',true)); ?></span><span>Status: <?php echo esc_html(get_post_meta($id,'_kathya_status',true)); ?></span></div>
<?php if(!empty($_GET['updated'])): ?><div class="k-notice"><?php echo esc_html(ucfirst(sanitize_text_field($_GET['updated']))); ?>.</div><?php endif; ?>
<form class="k-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"><input type="hidden" name="action" value="kathya_manage_appointment"><input type="hidden" name="token" value="<?php echo esc_attr($token); ?>"><?php wp_nonce_field('kathya_manage_submit','kathya_manage_nonce'); ?>
<h3>Reschedule</h3><div class="k-grid-2"><label>New date<input id="k-book-date" type="date" name="date" min="<?php echo esc_attr($today); ?>"></label><label>New time<select id="k-book-time" name="time"><option value="">Select a date first</option></select></label></div><button class="k-btn k-btn-primary" name="appointment_action" value="reschedule">Reschedule</button>
<button class="k-btn k-btn-danger" name="appointment_action" value="cancel" onclick="return confirm('Cancel this appointment?')">Cancel Appointment</button></form>
<script>window.KathyaBooking=<?php echo wp_json_encode(array('ajax'=>admin_url('admin-ajax.php'),'nonce'=>wp_create_nonce('kathya_booking_slots'))); ?>;</script>
<?php else: ?><p>Use the secure appointment-management link from your confirmation message.</p><?php endif; ?>
</div></section></main><?php get_footer(); ?>
