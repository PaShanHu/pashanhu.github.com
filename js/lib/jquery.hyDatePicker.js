(function($){
    "use strict";
    // datepicker plugin definiton
    // =======================
    /*
        如果old是undefined（之前$.fn.datepicker没被定义过），则noConflict重置$.fn.datepicker=undefined；
        如果之前已有插件定义了$.fn.datepicker，则noConflict重置$.fn.datepicker为之前的插件
    */
    var old = $.fn.datepicker;

    $.fn.datepicker = function (option) {
        return this.each(function () {
            var $this   = $(this);
            var data    = $this.data('hy.datepicker');
            var options = typeof option == 'object' && option;
            //data不存在，则初始化
            if (!data) {
                console.log('no data');
                $this.data('hy.datepicker', (data = new DatePicker(this, options)));
            }
            if (typeof option == 'string') {
                data[option]();
            }
        });
    };

    // datepicker NO CONFLICT
    // =================
    $.fn.datepicker.noConflict = function () {
        $.fn.datepicker = old;
        console.log(old);
        return this
    };

    $.fn.datepicker.defaults={
        theme:'default',
        size:{
            width:'220px',
            height:'200px'
        },
        start:null,
        end:null,
        language:'en',
        alwaysVisible:false,
        controlPosition:true,
        displayed:new Date(),
        selected:new Date(),
        mode:'day'//month--select month;year--select year
    };

    $.fn.datepicker.say=function(){
        console.log(DatePicker.count);
    }

    var DatePicker=function(element,options){
        DatePicker.count++;
        this.options=$.extend({
                clicked:false,
                changed:false,
                count:DatePicker.count,
            }, $.fn.datepicker.defaults, options);
        if(!this.options.selected){
            this.options.selected=new Date();
        }
        if(!this.options.displayed){
            this.options.displayed=new Date();
        }
        this.$element=$(element);
        this.monthNameArray=DatePicker.monthNames[this.options.language];
        this.init();
        
    };
    DatePicker.monthNames={
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
    DatePicker.count=0;
    DatePicker.prototype.init=function(){
        console.log(this.options);
        var $element=this.$element;
        var that=this;
        var calendar = $("<div style='width:"+this.options.size.width+";' class='datepicker' id='"+$element.attr('id')+"cal'>" +
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
        //设置坐标
        if(this.options.controlPosition){
            $element.one('click',function(){
                var t=$element.offset().top,l=$element.offset().left,h=$element.outerHeight();
                if(t+h>$(window).height()){
                    t=t-h-200;
                }
                calendar.offset({
                    top: t+h+8,
                    left: l+1
                });
            });
        }
        
        //弹出控件
        if(this.options.alwaysVisible){
            calendar.css('display','block');
        }else{
            $element.click(function(e) {
                that.reset($element, calendar,'daybox');
                calendar.css('display','block');
                that.options.clicked = true;
            });
        }
        
        //月份加减
        calendar.find('.date-box .date-change i').click(function(e) {
            var change = 0;
            if ($(this).hasClass('date-prev')) {
                change = -1;
            } else if ($(this).hasClass('date-next')) {
                change = 1;
            }
            that.options.displayed.setMonth(that.options.displayed.getMonth()+change);
            that.reset($element, calendar,'daybox');
        });

        //选中日期
        calendar.find('.day').click(function(e) {
            var $this=$(this);
            if (!$this.hasClass('disabled')) {
                var selected = that.options.selected;
                var displayed = that.options.displayed;
                selected.setFullYear(displayed.getFullYear());
                selected.setMonth(displayed.getMonth());
                selected.setDate($this.text());
                $element.val($.dateFormatter.toStandardDate(selected));
                that.options.changed = true;
                if(!that.options.alwaysVisible){
                    calendar.css('display','none');
                }
                console.log(that.options);
            }
        });

        //点击非控件区域
        calendar.click(function(e){
            e.stopPropagation();
        });
        $('html').click(function(e) {
            if (!that.options.clicked || that.options.changed) {
                calendar.fadeOut(200);
            }
            that.options.clicked = false;
            that.options.changed = false;
        });

        /*=======================================*/
        //显示月份panel
        calendar.find('.date-box .date-switch i').click(function(e) {
            that.reset($element,calendar,'monthbox');
            calendar.find('.month-box').css({'display':'block'});
        });

        //选择月份
        calendar.find('.month-box .month').click(function(e) {
            var $this=$(this);
            if (!$this.hasClass('disabled')) {
                calendar.find('.month-box').css({'display':'none'});
                var n=$this.index();console.log('index: '+n);
                var displayed = that.options.displayed,
                    selected = that.options.selected;
                var $i=$this.parents('.datepicker').find('.month-box .date-switch i');
                console.log($i);
                var year=$i.text();
                console.log(year);
                displayed.setFullYear(year);
                displayed.setMonth(n);
                selected.setMonth(n);
                selected.setFullYear(displayed.getFullYear());
                that.reset($element,calendar,'daybox');
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
            that.options.displayed.setFullYear(cur);
            $('.month-box .date-switch i').text();
            that.reset($element,calendar,'monthbox');
        });
    };
    DatePicker.prototype.reset = function(input,calendar,type) {
        var selected=this.options.selected,
            displayed=this.options.displayed,
            start=this.options.start,
            end=this.options.end;
        console.log(selected.getFullYear()+' '+selected.getMonth()+' '+selected.getDate());
        console.log(displayed.getFullYear()+' '+displayed.getMonth()+' '+displayed.getDate());
        var dp;
        if (start instanceof jQuery && (dp = start.data('hy.datepicker'))) {
            start = dp.selected || start.data('datePicker').start;
        }
        if (end instanceof jQuery && (dp = end.data('hy.datepicker'))) {
            end = dp.selected || end.data('datePicker').end;
        }
        if(start){
            start.setHours(0);start.setMinutes(0);start.setSeconds(0);
        }
        if(end){
            end.setHours(23);end.setMinutes(59);end.setSeconds(59);
        }
        // type=daybox
        if(!type||type==='daybox'){
            calendar.find('.date-switch i').text(this.monthNameArray[displayed.getMonth()]+' '+displayed.getFullYear());
            var tmp=new Date(displayed.getTime());
            tmp.setDate(1);
            tmp.setDate(tmp.getDate()-tmp.getDay());//tmp设置为当前box的第一天（周一，可能上月的末几天）
            calendar.find('.day').each(function() {
                var $this=$(this);
                $this.removeClass('disabled old new selected');
                $this.text(tmp.getDate());
                if (tmp.getMonth() != displayed.getMonth()) {
                    $this.addClass('disabled');//非当前月
                } else if (tmp.getDate() == selected.getDate()
                            && tmp.getMonth() == selected.getMonth()
                            && tmp.getFullYear() == selected.getFullYear()) {
                    $this.addClass('selected');//选中的日期，第一次则是当天
                }
                //start和end之外的disable
                if ((start && tmp.getTime() < start.getTime()) || (end && tmp.getTime() > end.getTime())) {
                    $this.addClass('disabled');
                }
                tmp.setDate(tmp.getDate()+1);
            });
        }else if(type==='monthbox'){
            var curPageYear=displayed.getFullYear();
            var selectedYear=selected.getFullYear();
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
        }
    };
})(jQuery);
