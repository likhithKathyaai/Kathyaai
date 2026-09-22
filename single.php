<?php get_header(); ?>
<main class="k-section"><div class="k-container article-wrap"><?php while(have_posts()): the_post(); ?><article><span class="k-eyebrow">KATHYA Resources</span><h1 class="k-title"><?php the_title(); ?></h1><p class="article-meta"><?php echo esc_html(get_the_date()); ?> · <?php echo esc_html(get_the_author()); ?></p><?php if(has_post_thumbnail()) the_post_thumbnail('large', array('loading'=>'eager')); ?><div class="article-content"><?php the_content(); ?></div></article><?php endwhile; ?></div></main>
<?php get_footer(); ?>
