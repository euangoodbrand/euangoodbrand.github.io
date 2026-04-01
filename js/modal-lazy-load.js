/**
 * Modal Iframe Lazy Loading
 * Only loads project iframe content when modal opens, destroys on close
 */
$(document).ready(function() {
    $('.modal').on('show.bs.modal', function() {
        var iframe = $(this).find('iframe[data-src]');
        if (iframe.length && !iframe.attr('src')) {
            iframe.attr('src', iframe.data('src'));
        }
    });

    $('.modal').on('hidden.bs.modal', function() {
        var iframe = $(this).find('iframe[data-src]');
        if (iframe.length) {
            iframe.attr('src', '');
        }
    });
});
