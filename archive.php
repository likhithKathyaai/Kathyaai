<?php get_header(); ?>
<main class="k-section"><div class="k-container"><span class="k-eyebrow">Resources</span><h1 class="k-title"><?php the_archive_title(); ?></h1><div class="k-grid-3"><?php if(have_posts()): while(have_posts()): the_post(); ?><article class="k-card"><h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2><p><?php echo esc_html(get_the_excerpt()); ?></p><a class="text-link" href="<?php the_permalink(); ?>">Read article →</a></article><?php endwhile; endif; ?></div><?php the_posts_pagination(); ?></div></main>
<?php get_footer(); ?>
