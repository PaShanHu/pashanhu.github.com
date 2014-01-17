$.ajax({
	url: '/js/lib/highlight.pack.js',
	dataType: "script",
	success: function(script,textStatus,jqXHR){
		console.log('start highlight');
		
		$('pre code').each(function(i, e) {hljs.highlightBlock(e)});
	}
});