$.ajax({
	url: '/js/lib/jquery.hoverfold.js',
	dataType: "script",
	success: function(script,textStatus,jqXHR){
		$( '.pic-hover-box' ).hoverfold();
	}
});