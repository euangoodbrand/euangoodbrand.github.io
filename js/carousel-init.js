/**
 * Updates Carousel Initialization
 * Owl Carousel configuration for the Recent Updates section
 */
$(document).ready(function() {
    $(".updates-carousel").owlCarousel({
        items: 3,
        loop: true,
        margin: 20,
        nav: true,
        dots: true,
        autoplay: true,
        autoplayTimeout: 5000,
        autoplayHoverPause: true,
        startPosition: 1,
        navText: ["&#10094;", "&#10095;"],
        responsive: {
            0: {
                items: 1
            },
            576: {
                items: 2
            },
            992: {
                items: 3
            }
        }
    });
});
