<?php /* Template Name: Book Appointment */ get_header();
$tz = get_theme_mod('kathya_booking_timezone','America/New_York'); $today=(new DateTime('now',new DateTimeZone($tz)))->format('Y-m-d'); ?>
<main class="k-page"><section class="k-section"><div class="k-container k-narrow">
<div class="k-eyebrow">KATHYA Booking</div><h1 class="k-title">Book an appointment.</h1><p class="k-subtitle left">Choose a service, date and available time. Receive confirmation by email, WhatsApp, or both.</p>
<?php if(($_GET['booking']??'')==='unavailable'): ?><div class="k-notice error">That time was just booked. Please choose another slot.</div><?php endif; ?>
<form class="k-form k-booking-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
<input type="hidden" name="action" value="kathya_booking"><?php wp_nonce_field('kathya_booking_submit','kathya_booking_nonce'); ?><input class="hp" type="text" name="website" tabindex="-1" autocomplete="off">
<div class="k-grid-2"><label>Service<select name="service" required><option value="">Choose service</option><option>AI Consultation</option><option>Product Demo</option><option>Implementation Call</option><option>Partnership Discussion</option><option>Custom AI Agent Consultation</option></select></label><label>Date<input id="k-book-date" type="date" name="date" min="<?php echo esc_attr($today); ?>" required></label></div>
<label>Available time<select id="k-book-time" name="time" required><option value="">Select a date first</option></select><small>Timezone: <?php echo esc_html($tz); ?></small></label>
<div class="k-grid-2"><label>Name<input type="text" name="name" required></label><label>Work email<input type="email" name="email" required></label><label>Phone / WhatsApp<input type="tel" name="phone" required></label><label>Confirmation<select name="notify"><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="both">Email + WhatsApp</option></select></label></div>
<label class="k-check"><input type="checkbox" name="consent" value="1" required> I agree to receive appointment confirmations and reminders through my selected channel.</label>
<button class="k-btn k-btn-primary" type="submit">Confirm Appointment</button>
</form></div></section></main>
<script>window.KathyaBooking=<?php echo wp_json_encode(array('ajax'=>admin_url('admin-ajax.php'),'nonce'=>wp_create_nonce('kathya_booking_slots'))); ?>;</script>
<?php get_footer(); ?>
