(function($){
	$.dateFormatter=(function(){
		var month={
			'Jan': 'January',
            'Feb': 'February',
            'Mar': 'March',
            'Apr': 'April',
            'May': 'May',
            'Jun': 'June',
            'Jul': 'July',
            'Aug': 'August',
            'Sep': 'September',
            'Oct': 'October',
            'Nov': 'November',
            'Dec': 'December'
		}
		return {
			toCNDate:function(date){
				var m=date.getMonth()+1,d=date.getDate();
				var month=m<10?'0'+m:m.toString(),
					day=d<10?'0'+d:d.toString();
				return date.getFullYear()+'年'+month+'月'+day+'日';
			},
			toCNYearMonth:function(date){
				var m=date.getMonth()+1;
				var month=m<10?'0'+m:m.toString();
				return date.getFullYear()+'年'+month+'月';
			},
			toStandardDate:function(date){
				var m=date.getMonth()+1,d=date.getDate();
				var month=m<10?'0'+m:m.toString(),
					day=d<10?'0'+d:d.toString();
				return date.getFullYear()+'-'+month+'-'+day;
			},
			toStandardYearMonth:function(date){
				var m=date.getMonth()+1;
				var month=m<10?'0'+m:m.toString();
				return date.getFullYear()+'-'+month;
			},
			toENDate:function(date){
				var arr=date.toDateString().split(" ");
				return arr[1]+' '+arr[2]+' '+arr[3];
			},
			toENYearMonth:function(date){
				var arr=date.toDateString().split(" ");
				return arr[1]+' '+arr[3];
			},
			toENYearFullMonth:function(date){
				var arr=date.toDateString().split(" ");
				return month[arr[1]]+' '+arr[3];
			},
			getShortMonth:function(date){
				var arr=date.toDateString().split(" ");
				return arr[1];
			}
		}
	})();

	var methods = {
		init : function(options) {
			opts = $.extend({},$.fn.datePicker.defaults,options);
			var namedMonths=$.fn.datePicker.monthNames[opts.language];

			//填充控件，设置控件
			var reset = function(input, calendar) {
				var selected = input.data('datePicker').selected;
				var displayed = input.data('datePicker').displayed;

				var start = input.data('datePicker').start;
				var end = input.data('datePicker').end;
				
				//如果start/end是另一个datePicker，则从其获取start/end
				if (start instanceof jQuery && start.data('datePicker')) {
					if (start.val()) {
						start = start.datePicker('value');
					} else {
						start = start.data('datePicker').start;
					}
				}
				if (end instanceof jQuery && end.data('datePicker')) {
					if (end.val()) {
						end = end.datePicker('value');
					} else {
						end = end.data('datePicker').end;
					}
				}
				//设置h m s
				if (start) {
					start.setHours(0);
					start.setMinutes(0);
					start.setSeconds(1);
				}
				if (end) {
					end.setHours(23);
					end.setMinutes(59);
					end.setSeconds(59);
				}

				//填充控件的header（月份，年份），即August, 2013这一行
				calendar.find('.date-switch i').text(namedMonths[displayed.getMonth()]+' '+displayed.getFullYear());

				//temp设置为控件第一格的日期。
				var temp = new Date(displayed.getTime());
				temp.setDate(1);
				temp.setDate(temp.getDate()-temp.getDay());
				//将tr（1-7）设置成正确的（1-30？31？29、28），多余的disable
				calendar.find('.day').each(function() {
					$(this).removeClass('disabled old new selected');
					$(this).text(temp.getDate());
					if (temp.getMonth() != displayed.getMonth()) {
						$(this).addClass('disabled');//非当前月
					} else if (temp.getDate() == selected.getDate()
								&& temp.getMonth() == selected.getMonth()
								&& temp.getFullYear() == selected.getFullYear()) {
						$(this).addClass('selected');//选中的日期，第一次则是当天
					}
					//start和end之外的disable
					if ((start && temp.getTime() < start.getTime()) || (end && temp.getTime() > end.getTime())) {
						$(this).addClass('disabled');
					}
					temp.setDate(temp.getDate()+1);
				});
			};

			//填充月份
			var resetMonthPanel=function(input,calendar){
				var displayed = input.data('datePicker').displayed;
				var selected=input.data('datePicker').selected;

				var start = input.data('datePicker').start;
				var end = input.data('datePicker').end;

				var curPageYear=displayed.getFullYear();
				var selectedYear=selected.getFullYear();
				console.log('displayed:'+$.dateFormatter.toCNDate(displayed) +'selected:' +$.dateFormatter.toCNDate(selected)+curPageYear+selectedYear);
				//填充控件的header（月份，年份），即August, 2013这一行
				calendar.find('.month-box .date-switch i').text(displayed.getFullYear());
				calendar.find('.month').removeClass('disabled old new selected');
				var n=displayed.getMonth()+1;
				if(curPageYear===selectedYear){
					calendar.find('.month:nth-child('+n+')').addClass('selected');
				}
				if(start){
					if(start.getFullYear()>curPageYear){
						calendar.find('.month').addClass('disabled');
					}else if(start.getFullYear()==curPageYear){
						var n=start.getMonth();
						calendar.find('.month:lt('+n+')').addClass('disabled');
					}
				};
				if(end){
					if(end.getFullYear()<curPageYear){
						calendar.find('.month').addClass('disabled');
					}else if(end.getFullYear()==curPageYear){
						var n=end.getMonth();
						calendar.find('.month:gt('+n+')').addClass('disabled');
					}
				};
			};

			var resetYearPanel=function(input,calendar){
				var displayed = input.data('datePicker').displayed;
				var selected=input.data('datePicker').selected;

				var start = input.data('datePicker').start;
				var end = input.data('datePicker').end;

				var curPageYear=displayed.getFullYear();
				var selectedYear=selected.getFullYear();
				var s=curPageYear-curPageYear%10;
				var e=s+11;
				var sy=start?start.getFullYear():Number.NEGATIVE_INFINITY,
					ey=end?end.getFullYear():Number.POSITIVE_INFINITY;
				//填充控件的header
				calendar.find('.year-box .date-switch i').text(s+'-'+e);
				calendar.find('.year').removeClass('disabled old new selected');
				calendar.find('.year').each(function(){
					var t=s++;
					$(this).text(t);
					if(t<sy){
						$(this).addClass('disabled old');
					}else if(t>ey){
						$(this).addClass('disabled new');
					}else if(t==selectedYear){
						$(this).addClass('selected');
					}
				});
			};

			return this.each(function() {
				var input = $(this);
				input.attr('readonly',true);//输入框只读
				//构造日历并加入文档
				var calendar = $("<div style='width:"+opts.width+";' class='datepicker' id='"+input.attr('id')+"cal'>" +
                    "<div class='date-box'>"+
	                    "<div class='date-controller'>"+
		                    "<span class='date-change'><i class='date-prev'>&lt;</i></span>"+
		                    "<span class='date-switch'><i class='date-month'>Month Year</i></span>"+
		                    "<span class='date-change'><i class='date-next'>&gt;</i></span>"+
	                    "</div>"+

	                    "<ul class='date-week'>"+
	                    	"<li class='week'>Su</li><li class='week'>Mo</li><li class='week'>Tu</li>"+
	                    	"<li class='week'>We</li><li class='week'>Th</li><li class='week'>Fr</li><li class='week'>Sa</li>"+
	                    "</ul>"+
                    
	                    "<div class='date-day'>"+
		                    "<ul class='day-row'>"+
		                        "<li class='day'>1</li><li class='day'>2</li><li class='day'>3</li><li class='day'>4</li><li class='day'>5</li><li class='day'>6</li><li class='day'>7</li>"+
		                    "</ul>"+
		                    "<ul class='day-row'>"+
		                        "<li class='day'>1</li><li class='day'>2</li><li class='day'>3</li><li class='day'>4</li><li class='day'>5</li><li class='day'>6</li><li class='day'>7</li>"+
		                    "</ul>"+
		                    "<ul class='day-row'>"+
		                        "<li class='day'>1</li><li class='day'>2</li><li class='day'>3</li><li class='day'>4</li><li class='day'>5</li><li class='day'>6</li><li class='day'>7</li>"+
		                    "</ul>"+
		                    "<ul class='day-row'>"+
		                        "<li class='day'>1</li><li class='day'>2</li><li class='day'>3</li><li class='day'>4</li><li class='day'>5</li><li class='day'>6</li><li class='day'>7</li>"+
		                    "</ul>"+
		                    "<ul class='day-row'>"+
		                        "<li class='day'>1</li><li class='day'>2</li><li class='day'>3</li><li class='day'>4</li><li class='day'>5</li><li class='day'>6</li><li class='day'>7</li>"+
		                    "</ul>"+
		                    "<ul class='day-row'>"+
		                        "<li class='day'>1</li><li class='day'>2</li><li class='day'>3</li><li class='day'>4</li><li class='day'>5</li><li class='day'>6</li><li class='day'>7</li>"+
		                    "</ul>"+
	                    "</div>"+
                    "</div>"+
                    "<div class='month-box'>"+
                    	"<div class='date-controller'>"+
		                    "<span class='date-change'><i class='date-prev'>&lt;</i></span>"+
		                    "<span class='date-switch'><i>Month Year</i></span>"+
		                    "<span class='date-change'><i class='date-next'>&gt;</i></span>"+
	                    "</div>"+
                    	"<ul class='month12'>"+
                    		"<li class='month'>Jan</li><li class='month'>Feb</li><li class='month'>Mar</li><li class='month'>Apr</li>"+
                    		"<li class='month'>May</li><li class='month'>Jun</li><li class='month'>Jul</li><li class='month'>Aug</li>"+
                    		"<li class='month'>Sep</li><li class='month'>Oct</li><li class='month'>Nov</li><li class='month'>Dec</li>"+
                    	"</ul>"+
                    "</div>"+
                    "<div class='year-box'>"+
                    	"<div class='date-controller'>"+
		                    "<span class='date-change'><i class='date-prev'>&lt;</i></span>"+
		                    "<span class='date-switch'><i>year Year</i></span>"+
		                    "<span class='date-change'><i class='date-next'>&gt;</i></span>"+
	                    "</div>"+
                    	"<ul class='year12'>"+
                    		"<li class='year'>2000</li><li class='year'>Feb</li><li class='year'>Mar</li><li class='year'>Apr</li>"+
                    		"<li class='year'>2004</li><li class='year'>Jun</li><li class='year'>Jul</li><li class='year'>Aug</li>"+
                    		"<li class='year'>2008</li><li class='year'>Oct</li><li class='year'>Nov</li><li class='year'>Dec</li>"+
                    	"</ul>"+
                    "</div>"+
                    "</div>");
				$('body').append(calendar);
				//input上绑定任意数据;clicked和changed是控件是否隐藏的标志
				input.data('datePicker',{
					clicked: false, 
					changed: false,
					selected: new Date(),//选中的日期
					displayed: new Date(),//显示的日期，同选中
					start: opts.start,
					end: opts.end
				});
				//初始化控件，弹出控件 
				input.one('click',function(){
					//设置坐标
					var t=input.offset().top,l=input.offset().left,h=input.outerHeight();
					if(t+h>$(window).height()){
						t=t-h-200;
					}
					calendar.offset({
						top: t+h+8,
	                    left: l+1
					});
				});
				//弹出控件
				input.click(function(e) {
					input.data('datePicker').displayed.setTime(input.data('datePicker').selected.getTime());
					reset(input, calendar);
					calendar.css('display','block');
					input.data('datePicker').clicked = true;
				});
				//点击控件时clicked true
				calendar.click(function(e) {
					input.data('datePicker').clicked = true;
				});
				//月份加减
				calendar.find('.date-box .date-change i').click(function(e) {
					var change = 0;
					if ($(this).hasClass('date-prev')) {
						change = -1;
					} else if ($(this).hasClass('date-next')) {
						change = 1;
					}
					input.data('datePicker').displayed.setMonth(input.data('datePicker').displayed.getMonth()+change);
					reset(input, calendar);
				});
				//选中日期
				calendar.find('.day').click(function(e) {
					if (!$(this).hasClass('disabled')) {
						var selected = input.data('datePicker').selected;//selected是input.data('datePicker').selected的引用
						//console.log(selected===input.data('datePicker').selected);   =>true
						var displayed = input.data('datePicker').displayed;
						selected.setFullYear(displayed.getFullYear());
						selected.setMonth(displayed.getMonth());
						selected.setDate($(this).text());
						input.val($.dateFormatter.toStandardDate(selected));
						input.data('datePicker').changed = true;
					}
				});
				/*-----------------------------------------------------*/
				//显示月份panel
				calendar.find('.date-box .date-switch i').click(function(e) {
					resetMonthPanel(input,calendar);
					calendar.find('.month-box').css({'display':'block'});
				});
				//选择月份
				calendar.find('.month-box .month').click(function(e) {
					if (!$(this).hasClass('disabled')) {
						calendar.find('.month-box').css({'display':'none'});
						var n=$(this).index();
						console.log('index: '+n);
						var displayed = input.data('datePicker').displayed,
							selected = input.data('datePicker').selected;
						//var year=$('.month-box .date-switch i').text();//错误：多个datepicker实例时，取得的year并非数字，而是多个i的所有文字
						var $i=$(this).parents('.datepicker').find('.month-box .date-switch i');
						console.log($i);
						var year=$i.text();
						console.log(year);
						displayed.setFullYear(year);
						displayed.setMonth(n);
						selected.setMonth(n);
						selected.setFullYear(displayed.getFullYear());
						//after change
						console.log('displayed: '+$.dateFormatter.toCNDate(displayed)+'   selected:'+$.dateFormatter.toCNDate(selected));
						reset(input,calendar);
					}
				});
				//年份增减
				calendar.find('.month-box .date-change i').click(function(e) {
					var change = 0,year=parseInt($('.month-box .date-switch i').text());
					if ($(this).hasClass('date-prev')) {
						change = -1;
					} else if ($(this).hasClass('date-next')) {
						change = 1;
					}
					var cur=year+change;
					input.data('datePicker').displayed.setFullYear(cur);
					$('.month-box .date-switch i').text();
					resetMonthPanel(input,calendar);
				});
				/*-----------------------------------------------------*/
				//显示年份panel
				calendar.find('.month-box .date-switch i').click(function(e) {
					resetYearPanel(input,calendar);
					calendar.find('.year-box').css({'display':'block'});
				});
				//年份加减
				calendar.find('.year-box .date-change i').click(function(e){
					var change = 0,year=parseInt($('.month-box .date-switch i').text());
					if ($(this).hasClass('date-prev')) {
						change = -10;
					} else if ($(this).hasClass('date-next')) {
						change = 10;
					}
					var displayed=input.data('datePicker').displayed;
					var fy=year+change,cur=displayed.getFullYear();
					displayed.setFullYear(cur+change);
					$('.year-box .date-switch i').text(fy+'-'+(fy+11));
					resetYearPanel(input,calendar);
				});
				//年份选择
				calendar.find('.year-box .year').click(function(e) {
					if (!$(this).hasClass('disabled')) {
						calendar.find('.year-box').css({'display':'none'});
						var n=parseInt($(this).text());
						var displayed = input.data('datePicker').displayed;
						displayed.setFullYear(n);
						input.data('datePicker').selected.setFullYear(n);
						resetMonthPanel(input,calendar);
					}
				});
				/*-----------------------------------------------------*/
				//点击非控件区域
				$('html').click(function(e) {
					input.data('datePicker')['htmlEvent'] = e;
					if (!input.data('datePicker').clicked || input.data('datePicker').changed) {
						calendar.fadeOut(100);
					}
					input.data('datePicker').clicked = false;
					input.data('datePicker').changed = false;
				});
			});
		},
		value : function(value) {
			if (value) {
				$(this).data('datePicker').selected = new Date(value.getTime());
				$(this).val(value.getDate()+'/'+(value.getMonth()+1)+'/'+value.getFullYear());
			} else {
				if ($(this).val()) {
					return new Date($(this).data('datePicker').selected.getTime());
				} else {
					return null;
				}
			}
		},
		destroy : function() {
			return this.each(function() {
				var input = $(this);
				var calendar = $('#'+$(this).attr('id')+'cal');
				$('html').unbind(input.data('datePicker').htmlEvent);
				calendar.find('.dp_cell tr:not(.dp_header) td').unbind('click');
				calendar.unbind('click');
				input.unbind('click').removeData('datePicker').css({
                    'background': 'white',
                    'padding-right': '0'
                }).prop('readonly',true);
			});
		}
	};

	$.fn.datePicker = function(method) {
		if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method '+method+' does not exist on jquery.datePicker');
        }
	};
	$.fn.datePicker.defaults={
		width: '220px',
		language: 'zh-CN',
		start: null,
		end: null
	};
	$.fn.datePicker.monthNames={
		'zh-CN':{
			0: '一月',
            1: '二月',
            2: '三月',
            3: '四月',
            4: '五月',
            5: '六月',
            6: '七月',
            7: '八月',
            8: '九月',
            9: '十月',
            10: '十一月',
            11: '十二月'
		},
		'en':{
			0: 'January',
            1: 'February',
            2: 'March',
            3: 'April',
            4: 'May',
            5: 'June',
            6: 'July',
            7: 'August',
            8: 'September',
            9: 'October',
            10: 'November',
            11: 'December'
		}
	};
})(jQuery);