require.config({
	baseUrl:'/js/lib',
	paths:{
		'jquery':'jquery.min',
		'easing':'jquery.easing.min'
	},
	shim:{
		'easing':['jquery'],
	}
}); 
require(['jquery','easing'],function($){
	$(function(){
		console.log('start')
		var App={};

		/*dynamic load js*/
		var $script=$('script[data-type=extraJs]');
		App.jsUrls=[];
		$script.each(function(index){
			var src=$(this).attr('data-src');
			App.jsUrls[index]=src;
			$.getScript(src);
		})
		

		/*backto top,to bottom*/
		App.$backToTop=$('.back-to-top');
		App.$toBottom=$('.to-bottom');
		$window=$(window);
		function toggleSideMenu(){
			if($window.scrollTop()>200){
				App.$backToTop.css('opacity',1);
			}else{
				App.$backToTop.css('opacity',0);
			}

			if($window.scrollTop()>$(document).height()-$window.height()-200){
				App.$toBottom.css('opacity',0);
			}else{
				App.$toBottom.css('opacity',1);
			}
		};
		toggleSideMenu();
		$window.scroll(function(){
			toggleSideMenu();
		});
		$('body').on('click','.back-to-top',function(){
			$('html,body').animate({
				scrollTop:0
			},1000,'easeInOutCirc');
		});
		$('body').on('click','.to-bottom',function(){
			$('html,body').animate({
				scrollTop:$(document).height()-$window.height()
			},1000,'easeInOutCirc');
		});

		/*box-shadow*/
		$(document.body).wrapInner('<div class="main-wrapper"></div>');
	});
});