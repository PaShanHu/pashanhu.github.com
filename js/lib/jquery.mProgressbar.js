/*
	name:jQuery.mProgressbar.js,
	author:Jerry Y,
	version:0.0.1,
	date:2013-11-26,
	description:progressbar,step,jquery
*/
(function($){
	var Progressbar=function(element,options){
		this.opts=options;
		this.$el=$(element);
		this.initialize();
	};
	Progressbar.defaults={
		theme:'green',
		animation:true,
		duration:1200,
		step:4,
		activateStep:1,
		stepType:'only-right',//  ====0===center   0====only-right  ====0only-left
		textPosition:'center-top',//center-bottom
		text:['First','Second','Third','Fourth'],
		textType:'text',//html
		setNum:false,
		nodeType:'circle'//rect,round-corner
	};
	Progressbar.prototype.initialize=function(){
		this.$el.addClass('mProgressbar-wrapper').append('<div class="mProgressbar"><div class="bar-inner"></div></div>');
		if(this.opts.step<2){
			this.opts.step=2;
		}
		var $inner=this.$el.find('.bar-inner');
		for(var i=0;i<this.opts.step;i++){
			$inner.append('<div class="step"><span class="bar-left"></span><span class="node"></span><span class="text"></span><span class="bar-right"></span></div>');
		};
		//hide first
		this.$el.find('.mProgressbar').css('width','0');

		$inner.addClass(this.opts.stepType+' '+this.opts.nodeType+' '+this.opts.textPosition);
		var astep=this.opts.activateStep;
		for(var i=1;i<astep;i++){
			var t=i-1;
			$inner.find('.step:eq('+t+')').addClass('active');
		};
		$inner.find('.step:eq('+(astep-1)+')').addClass('active current');
		$inner.find('.step').addClass('step'+this.opts.step);

		//animate
		var dur=this.opts.duration;
		var that=this;
		if(!this.opts.animation) dur=1;
		this.$el.find('.mProgressbar').animate({
			width:'100%'
		},dur,function(){
			$(this).removeAttr('style');
			that.setContent();
		})
	};
	Progressbar.prototype.setContent=function(){
		var step=this.opts.step,
			text=this.opts.text,
			$label=null,
			w=0,
			h=0,
			left=0,
			fun=this.opts.textType;
		for(var i=0;i<step;i++){
			$label=this.$el.find('.text:eq('+i+')');
			$label[fun](text[i]);
		}
	}
	$.fn.mProgressbar=function(options){
		return this.each(function(){
			var $this=$(this),
				data=$this.data('yh.mProgressbar'),
				opts=$.extend({},Progressbar.defaults,options);
			if(!data){
				$this.data('yh.mProgressbar',(data=new Progressbar(this,opts)));
			}
		});
	};
	$.fn.mProgressbar.defaults=Progressbar.defaults;
}(jQuery));