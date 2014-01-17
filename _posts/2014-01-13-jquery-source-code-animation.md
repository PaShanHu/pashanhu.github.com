---
layout: default
title: 学习jQuery源码-动画
postDate: 2013-01-13
tags: [jQuery, source code, queue]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###从最外层API入手

    // Generate shortcuts for custom animations
    jQuery.each({
        slideDown: genFx("show"),
        slideUp: genFx("hide"),
        slideToggle: genFx("toggle"),
        fadeIn: { opacity: "show" },
        fadeOut: { opacity: "hide" },
        fadeToggle: { opacity: "toggle" }
    }, function( name, props ) {
        jQuery.fn[ name ] = function( speed, easing, callback ) {
            return this.animate( props, speed, easing, callback );
        };
    });

    fadeTo: function( speed, to, easing, callback ) {

        // show any hidden elements after setting opacity to 0
        return this.filter( isHidden ).css( "opacity", 0 ).show()

            // animate to the value specified
            .end().animate({ opacity: to }, speed, easing, callback );
    },

除了fadeTo稍微多处理了几步，其它动画API都是直接交给`jQuery.fn.animate`来处理的，所以只分析`jQuery.fn.animate`。

####jQuery.fn.animate

    animate: function( prop, speed, easing, callback ) {
        var empty = jQuery.isEmptyObject( prop ),
            //参数修正
            optall = jQuery.speed( speed, easing, callback ),
            doAnimation = function() {
                // Operate on a copy of prop so per-property easing won't be lost
                // 第二个参数用了extend来复制，不污染prop
                var anim = Animation( this, jQuery.extend( {}, prop ), optall );

                // Empty animations, or finishing resolves immediately
                // 属性为空，直接resolve
                if ( empty || data_priv.get( this, "finish" ) ) {
                    anim.stop( true );
                }
            };
            doAnimation.finish = doAnimation;

        return empty || optall.queue === false ?
            this.each( doAnimation ) :
            this.queue( optall.queue, doAnimation );
    },

整个animate函数很简洁，大量的处理环节都被封装了。下面就具体分析封装的更底层的函数。

###动画的底层函数

####jQuery.speed

jQuery.speed是纯粹的参数处理与修正，修正的参数是animate中除了属性（props）外的参数。jQuery.fn.animate把speed, easing, callback参数传给它，它返回处理后的参数对象opt。

    jQuery.speed = function( speed, easing, fn ) {
        // opt最终是有duration、easing、complete三属性的对象
        // speed是对象？是则用extend复制一份传给opt（防止污染speed），否则构造上面说的对象
        // 可以看出complete优先级最高
        var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
            //complete填充其实很有意思，从这里可以看到jQuery参数处理的强大
            // fn存在就fn；fn不存在且easing存在，那就easing；否则speed是函数就speed
            complete: fn || !fn && easing ||
                jQuery.isFunction( speed ) && speed,
            duration: speed,
            // easing:fn存在，那就easing；easing存在且不是函数，那就easing
            easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
        };

        // duration就是赋予speed，完全没做处理，处理在这一步
        // jQuery.fx.off存在？存在就0，否则判断speed
        // speed是数字？是就维持数字，不是数字是fast、slow吗？
        // 是的话从jQuery.fx.speeds取出相应数值，不是就取默认值jQuery.fx.speeds._default
        opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
            opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

        // normalize opt.queue - true/undefined/null -> "fx"
        // 设置opt.queue（默认就是fx）
        if ( opt.queue == null || opt.queue === true ) {
            opt.queue = "fx";
        }

        // Queueing
        opt.old = opt.complete;

        // 再次处理opt.complete，未处理前complete可能五花八门的值
        // 原complete是函数，维持；否则
        // 执行jQuery.dequeue( this, opt.queue );
        opt.complete = function() {
            if ( jQuery.isFunction( opt.old ) ) {
                opt.old.call( this );
            }

            if ( opt.queue ) {
                jQuery.dequeue( this, opt.queue );
            }
        };

        return opt;
    };

源码没什么好多说的，已在注释中详细分析。

####jQuery.Tween

本来应该接着看doAnimation中用到的Animation对象，但Animation对象用到了Tween对象，所以可以先看Tween。

    function Tween( elem, options, prop, end, easing ) {
        return new Tween.prototype.init( elem, options, prop, end, easing );
    }
    jQuery.Tween = Tween;
    Tween.prototype = {};
    Tween.prototype.init.prototype = Tween.prototype;

浓浓的即视感，好吧，这跟jQuery对象的构造相似。现在我们来看Tween.prototype。

#####Tween.prototype

1.  `constructor: Tween,`

2.  init，初始化。
        
        init: function( elem, options, prop, end, easing, unit ) {
            this.elem = elem;
            this.prop = prop;
            // easing不存在就默认为swing
            this.easing = easing || "swing";
            this.options = options;
            this.start = this.now = this.cur();
            this.end = end;
            // 通过cssNumber来确定是否不要自动添加单位；是就把单位置为"",否则"px"
            this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
        },

3.  cur，获取指定属性当前的值

        cur: function() {
            var hooks = Tween.propHooks[ this.prop ];
            // 可以知道，Tween.propHooks除了_default只有scrollLeft、scrollTop两个属性，且两者只有set方法
            // 因此，最终其实是是返回_default.get( this )
            return hooks && hooks.get ?
                hooks.get( this ) :
                Tween.propHooks._default.get( this );
        },

4.  run，计算中间某点的当前值

        run: function( percent ) {
            var eased,
                hooks = Tween.propHooks[ this.prop ];

            //根据参数percent计算this.pos/eased
            if ( this.options.duration ) {
                this.pos = eased = jQuery.easing[ this.easing ](
                    percent, this.options.duration * percent, 0, 1, this.options.duration
                );
            } else {
                this.pos = eased = percent;
            }
            // 根据eased计算当前值this.now
            this.now = ( this.end - this.start ) * eased + this.start;

            if ( this.options.step ) {
                this.options.step.call( this.elem, this.now, this );
            }

            // 如果有钩子的set方法，优先钩子，否则默认的set
            if ( hooks && hooks.set ) {
                hooks.set( this );
            } else {
                Tween.propHooks._default.set( this );
            }
            return this;
        }

#####Tween.propHooks

Tween.propHooks很显然是钩子，用于兼容处理。

    Tween.propHooks = {
        _default: {
            get: function( tween ) {
                var result;
                // 元素elem属性prop的值不为空（elem.prop存在），并且
                // elem.style不存在或者elem.style[prop]不存在
                // 直接返回elem.prop
                if ( tween.elem[ tween.prop ] != null &&
                    (!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
                    return tween.elem[ tween.prop ];
                }

                // passing an empty string as a 3rd parameter to .css will automatically
                // attempt a parseFloat and fallback to a string if the parse fails
                // so, simple values such as "10px" are parsed to Float.
                // complex values such as "rotate(1rad)" are returned as is.
                // 用jQuery.css获取样式值
                result = jQuery.css( tween.elem, tween.prop, "" );
                // Empty strings, null, undefined and "auto" are converted to 0.
                // result为空或者空字符串或者auto时返回0
                return !result || result === "auto" ? 0 : result;
            },
            set: function( tween ) {
                // use step hook for back compat - use cssHook if its there - use .style if its
                // available and use plain properties where available
                // 三种优先级的样式设置
                if ( jQuery.fx.step[ tween.prop ] ) {
                    jQuery.fx.step[ tween.prop ]( tween );
                } else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
                    jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
                } else {
                    tween.elem[ tween.prop ] = tween.now;
                }
            }
        }
    };

    // scrollTop、scrollLeft的特殊设置：直接更改elem.scrollTop、scrollLeft属性。
    Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
        set: function( tween ) {
            if ( tween.elem.nodeType && tween.elem.parentNode ) {
                tween.elem[ tween.prop ] = tween.now;
            }
        }
    };

#####Tween总结

到这儿，Tween的总体结构、功能基本清楚了。Tween就是**计算动画中间某个时刻的具体值**，**设置相应属性为这个值**。




####Animation

jQuery.fn.animate经过jQuery.speed处理参数后，最终交给Animation来处理。现在分析Animation：

**分析：**

1.  首先还是定义变量与初始化。

        var result,
            stopped,
            index = 0,
            // animationPrefilters = [ defaultPrefilter ],
            // length应该是1
            length = animationPrefilters.length,
            // 定义了一个deferred对象，总是删除tick.elem属性
            deferred = jQuery.Deferred().always( function() {
                // don't match elem in the :animated selector
                delete tick.elem;
            }),
            // 定义了tick函数
            tick = function() {
                if ( stopped ) {
                    return false;
                }
                var currentTime = fxNow || createFxNow(),
                    remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
                    // archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
                    temp = remaining / animation.duration || 0,
                    percent = 1 - temp,
                    index = 0,
                    length = animation.tweens.length;

                for ( ; index < length ; index++ ) {
                    animation.tweens[ index ].run( percent );
                }

                deferred.notifyWith( elem, [ animation, percent, remaining ]);

                if ( percent < 1 && length ) {
                    return remaining;
                } else {
                    deferred.resolveWith( elem, [ animation ] );
                    return false;
                }
            },
            // animation是deferred的promise对象合并到一个对象，添加了很多属性
            animation = deferred.promise({
                elem: elem,
                props: jQuery.extend( {}, properties ),
                // 原options基础上添加了specialEasing对象
                opts: jQuery.extend( true, { specialEasing: {} }, options ),
                originalProperties: properties,
                originalOptions: options,
                startTime: fxNow || createFxNow(),
                duration: options.duration,
                tweens: [],
                createTween: function( prop, end ) {
                    var tween = jQuery.Tween( elem, animation.opts, prop, end,
                            animation.opts.specialEasing[ prop ] || animation.opts.easing );
                    animation.tweens.push( tween );
                    return tween;
                },
                stop: function( gotoEnd ) {
                    var index = 0,
                        // if we are going to the end, we want to run all the tweens
                        // otherwise we skip this part
                        length = gotoEnd ? animation.tweens.length : 0;
                    if ( stopped ) {
                        return this;
                    }
                    stopped = true;
                    for ( ; index < length ; index++ ) {
                        animation.tweens[ index ].run( 1 );
                    }

                    // resolve when we played the last frame
                    // otherwise, reject
                    if ( gotoEnd ) {
                        deferred.resolveWith( elem, [ animation, gotoEnd ] );
                    } else {
                        deferred.rejectWith( elem, [ animation, gotoEnd ] );
                    }
                    return this;
                }
            }),
            props = animation.props;

    这些变量应该还是很好理解的，当然更深入的要在下面的使用中才能理解。

2.  执行`propFilter( props, animation.opts.specialEasing );`，顾名思义，应该是过滤（处理）属性。

    具体分析propFilter函数：

        // props是对象，如：{'left':'500px',height: ['toggle', 'swing']}
        function propFilter( props, specialEasing ) {
            var index, name, easing, value, hooks;

            // camelCase, specialEasing and expand cssHook pass
            for ( index in props ) {
                name = jQuery.camelCase( index );
                easing = specialEasing[ name ];
                value = props[ index ];     
                // value是数组，easing设置为value[ 1 ]，然后
                // value、props[ index ]重新设置为value[ 0 ]
                if ( jQuery.isArray( value ) ) {
                    easing = value[ 1 ];
                    value = props[ index ] = value[ 0 ];
                }

                // 修正属性名：删掉非驼峰式，保留驼峰式
                if ( index !== name ) {
                    props[ name ] = value;
                    delete props[ index ];
                }

                // 一个钩子，对有expand属性的属性钩子做特殊处理
                // 比如borderWidth:10px；就转换成borderTopWidth:10px,borderRightWidth: 10px, borderBottomWidth: 10px, borderLeftWidth: 10px
                hooks = jQuery.cssHooks[ name ];
                if ( hooks && "expand" in hooks ) {
                    // 以上面的borderWidth为例，value就是
                    // Object {borderTopWidth: 10px, borderRightWidth: 10px, borderBottomWidth: 10px, borderLeftWidth: 10px}
                    value = hooks.expand( value );

                    //删除原属性
                    delete props[ name ];

                    // not quite $.extend, this wont overwrite keys already present.
                    // also - reusing 'index' from above because we have the correct "name"
                    // 替换成expand给出的属性组
                    for ( index in value ) {
                        if ( !( index in props ) ) {// 该属性名不在props中，则添加
                            props[ index ] = value[ index ];
                            specialEasing[ index ] = easing;
                        }
                    }
                } else {// 把每种属性的对应easing添加到specialEasing，即animation.opts.specialEasing中
                    specialEasing[ name ] = easing;
                }
            }
        }

    **propFilter就是处理props对象的，处理的是jQuery.speed没处理的属性们。主要把属性标准化为驼峰式；把borderWidth、margin、padding之类的扩展出来；另外如果属性含有各自的easing，那么添加到specialEasing。**

    比如我们可以这样调用animate：

        $('#book').animate({
            width: ['toggle', 'swing'],
            height: ['toggle', 'swing'],
            opacity: 'toggle'
        }, 5000, 'linear', function() {
            $(this).after('<div>Animation complete.</div>');
        });

    那么propFilter就是处理`{width: ['toggle', 'swing'],...}`的。

3.  调用defaultPrefilter函数

        // animationPrefilters就是[ defaultPrefilter ]
        for ( ; index < length ; index++ ) {
            result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
            if ( result ) {
                return result;
            }
        }

    具体分析defaultPrefilter函数：
    
        function defaultPrefilter( elem, props, opts ) {
            /* jshint validthis: true */
            var prop, value, toggle, tween, hooks, oldfire,
                anim = this,
                orig = {},
                style = elem.style,
                // 元素是否不可见
                hidden = elem.nodeType && isHidden( elem ),
                // 元素的fxshow缓存
                dataShow = data_priv.get( elem, "fxshow" );

            // handle queue: false promises
            // 处理错误的options（opts.queue不存在）
            if ( !opts.queue ) {
                hooks = jQuery._queueHooks( elem, "fx" );
                // hooks添加一个unqueued属性，并作为执行fire的判断标志
                if ( hooks.unqueued == null ) {
                    hooks.unqueued = 0;
                    oldfire = hooks.empty.fire;
                    hooks.empty.fire = function() {
                        if ( !hooks.unqueued ) {
                            oldfire();
                        }
                    };
                }
                hooks.unqueued++;

                anim.always(function() {
                    // doing this makes sure that the complete handler will be called
                    // before this completes
                    // 嵌套always，保证complete处理函数先于这个函数调用。
                    anim.always(function() {
                        hooks.unqueued--;
                        // length=0,执行hooks.empty.fire();
                        if ( !jQuery.queue( elem, "fx" ).length ) {
                            hooks.empty.fire();
                        }
                    });
                });
            }

            // height/width overflow pass
            // 有宽高属性时的处理
            if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
                // Make sure that nothing sneaks out
                // Record all 3 overflow attributes because IE9-10 do not
                // change the overflow attribute when overflowX and
                // overflowY are set to the same value
                // 对ie9-10的兼容：overflowX和overflowY设置成相同值时，ie9-10不更改overflow属性
                opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

                // Set display property to inline-block for height/width
                // animations on inline elements that are having width/height animated
                // inline元素的display设置为inline-block，如果设置该元素宽高的话
                if ( jQuery.css( elem, "display" ) === "inline" &&
                        jQuery.css( elem, "float" ) === "none" ) {

                    style.display = "inline-block";
                }
            }

            // 如果有opts.overflow属性，那么重置style.overflow
            if ( opts.overflow ) {
                style.overflow = "hidden";
                anim.always(function() {
                    style.overflow = opts.overflow[ 0 ];
                    style.overflowX = opts.overflow[ 1 ];
                    style.overflowY = opts.overflow[ 2 ];
                });
            }


            // show/hide pass
            // 属性值是toggle、show、hide，特殊处理
            for ( prop in props ) {
                value = props[ prop ];
                //如果value是toggle、show、hide
                if ( rfxtypes.exec( value ) ) {
                    delete props[ prop ];
                    toggle = toggle || value === "toggle";//toggle现在是bool值
                    // value是hide或者show
                    if ( value === ( hidden ? "hide" : "show" ) ) {

                        // If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
                        // 如果缓存已有dataShow，hidden设为true
                        if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
                            hidden = true;
                        } else {
                            continue;
                        }
                    }
                    //把该属性添加到orig对象
                    orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
                }
            }

            // orig不是空对象，即存在某属性的值是toggle、show、hide
            if ( !jQuery.isEmptyObject( orig ) ) {
                if ( dataShow ) {
                    if ( "hidden" in dataShow ) {
                        hidden = dataShow.hidden;
                    }
                } else {
                    dataShow = data_priv.access( elem, "fxshow", {} );
                }

                // store state if its toggle - enables .stop().toggle() to "reverse"
                // dataShow.hidden等于!hidden
                if ( toggle ) {//toggle是true的话，更新dataShow.hidden的值（表示动画后的可见性状态）
                    dataShow.hidden = !hidden;
                }
                if ( hidden ) {// hidden是true，则立即调用show显示
                    jQuery( elem ).show();
                } else {// hidden是false，不立即隐藏，只是添加到anim的doneList
                    anim.done(function() {
                        jQuery( elem ).hide();
                    });
                }
                anim.done(function() {
                    var prop;

                    // 删除fxshow缓存
                    data_priv.remove( elem, "fxshow" );
                    // 真正设置样式
                    for ( prop in orig ) {
                        jQuery.style( elem, prop, orig[ prop ] );
                    }
                });

                for ( prop in orig ) {
                    tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

                    if ( !( prop in dataShow ) ) {
                        dataShow[ prop ] = tween.start;
                        if ( hidden ) {
                            tween.end = tween.start;
                            tween.start = prop === "width" || prop === "height" ? 1 : 0;
                        }
                    }
                }
            }
        }

    代码有些繁杂，但函数做什么还是清晰的，就是对props做些前置处理。

4.  执行`jQuery.map( props, createTween, animation );`

    3中createTween函数也未解释，现在正好一起解释。

        function createTween( value, prop, animation ) {
            var tween,
                collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
                // 就是tweeners[ "*" ]，即[function(prop, value){}]
                index = 0,
                length = collection.length;
            for ( ; index < length; index++ ) {
                if ( (tween = collection[ index ].call( animation, prop, value )) ) {

                    // we're done with this property
                    return tween;
                }
            }
        }

    按照字面理解，createTween就是创建补间动画。createTween的核心就是collection中的函数，但不急着看该函数，先把参数解释一下。

    由于是map调用，所以createTween中的prop就是map中props的每个属性，value就是该prop属性的值，而animation就是map中传递的animation。

    好了，现在看核心的`collection[0]`（其实collection长度就是1）：`tweeners[ "*" ][0]`。

    1.  `tweeners[ "*" ][0]`：

            function( prop, value ) {
                // this就是传递过来的animation，所以首先分析animation.createTween
                var tween = this.createTween( prop, value ),
                    target = tween.cur(),
                    parts = rfxnum.exec( value ),
                    // 获取单位
                    unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

                    // Starting value computation is required for potential unit mismatches
                    // 开始值计算，设A是( jQuery.cssNumber[ prop ] || unit !== "px" && +target )计算结果
                    // B是rfxnum.exec( jQuery.css( tween.elem, prop ) )计算结果，B是数组
                    // 不需单位，则A是true，返回B
                    // 需要单位，但unit不是px，则A值是target，如果A是0，那么返回0，否则返回B
                    // 需要单位，但unit是px，则A值是false，start=false。
                    start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
                        rfxnum.exec( jQuery.css( tween.elem, prop ) ),
                    scale = 1,
                    maxIterations = 20;

                // 以rfxnum.exec('5px')为例
                // 则parts是["5px", undefined, "5", "px"]
                // 以rfxnum.exec('+=12px')为例
                // 则parts是["+=12px", "+", "12", "px"]
                if ( start && start[ 3 ] !== unit ) {
                    // Trust units reported by jQuery.css
                    unit = unit || start[ 3 ];

                    // Make sure we update the tween properties later on
                    parts = parts || [];

                    // Iteratively approximate from a nonzero starting point
                    // 从非零点开始迭代
                    start = +target || 1;

                    do {
                        // If previous iteration zeroed out, double until we get *something*
                        // Use a string for doubling factor so we don't accidentally see scale as unchanged below
                        scale = scale || ".5";

                        // Adjust and apply
                        start = start / scale;
                        jQuery.style( tween.elem, prop, start + unit );

                    // Update scale, tolerating zero or NaN from tween.cur()
                    // And breaking the loop if scale is unchanged or perfect, or if we've just had enough
                    } while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
                }

                // Update tween properties
                // 更新tween
                if ( parts ) {
                    start = tween.start = +start || +target || 0;
                    tween.unit = unit;
                    // If a +=/-= token was provided, we're doing a relative animation
                    tween.end = parts[ 1 ] ?//+=/-=时，parts[ 1 ]是+/-号
                        start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :// 以原值加减parts[2]
                        +parts[ 2 ];// 直接返回parts[2]
                }

                return tween;
            }

        `tweeners[ "*" ][0]`函数是返回一个对应某个prop的tween对象。在函数内第一句定义，用到了animation.createTween()方法，现在来看这个方法。

    2.  animation.createTween：

            animation = deferred.promise({
                ...
                createTween: function( prop, end ) {
                    var tween = jQuery.Tween( elem, animation.opts, prop, end,
                            animation.opts.specialEasing[ prop ] || animation.opts.easing );
                    animation.tweens.push( tween );
                    return tween;
                },
                ...
            }

        传参给jQuery.Tween，创建一个tween对象返回。这个tween对象被压入数组tweens。

        源码一路解析到这里，似乎看到一点曙光了。**每个属性的动画由对应tween对象来完成，tween对象压入tweens数组，那么这个数组就保存了所有动画。**

5.  map后面是if判断，执行start函数（动画开始前触发的函数）

        if ( jQuery.isFunction( animation.opts.start ) ) {
            animation.opts.start.call( elem, animation );
        }

6.  调用jQuery.fx.timer，这是动画真正开始。

        jQuery.timers = [];

        jQuery.fx.timer = function( timer ) {
            if ( timer() && jQuery.timers.push( timer ) ) {
                jQuery.fx.start();
            }
        };

        jQuery.fx.timer(
            jQuery.extend( tick, {
                elem: elem,
                anim: animation,
                queue: animation.opts.queue
            })
        );

    分析：首先通过extend向函数tick添加了elem、anim、queue等3属性，然后调用`jQuery.fx.timer`；timer在if语句中执行tick函数，并把tick压入jQuery.timers数组，然后执行`jQuery.fx.start();`。

    流程很清楚，现在先分析tick函数（Animation开头定义）：

        tick = function() {
            if ( stopped ) {//如果已经停止，返回false
                return false;
            }
            var currentTime = fxNow || createFxNow(),// 当前时间

                // 剩余时间
                remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
                // archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
                temp = remaining / animation.duration || 0,
                // 当前是百分之几
                percent = 1 - temp,
                index = 0,
                length = animation.tweens.length;

            for ( ; index < length ; index++ ) {
                // 为每个tween，设置当前值
                animation.tweens[ index ].run( percent );
            }
            // 触发正在处理的函数  process
            deferred.notifyWith( elem, [ animation, percent, remaining ]);

            if ( percent < 1 && length ) {
                return remaining;
            } else {
                // 动画结束
                deferred.resolveWith( elem, [ animation ] );
                return false;
            }
        },

7.  结束Animation，返回一个promise对象，添加了done、fail等处理函数。

####jQuery.fx

前面的好多地方都用到了jQuery.fx的函数，现在就详细介绍一下jQuery.fx。

    jQuery.fx = Tween.prototype.init;

jQuery.fx就是Tween.prototype.init的引用。比如：

    var x=$.Tween(document.body,{},'width','200px');

那么 `x.init` 就是 `jQuery.fx`。

---

#####记录数据或者默认值：

    jQuery.fx.speeds = {
        slow: 600,
        fast: 200,
        // Default speed
        _default: 400
    };

    // Back Compat <1.8 extension point
    jQuery.fx.step = {};

    jQuery.fx.interval = 13;//执行间隔

#####工具函数：

1.  每隔`jQuery.fx.interval`毫秒执行`jQuery.fx.tick`：

        jQuery.fx.start = function() {
            if ( !timerId ) {
                timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
            }
        };

2.  停止执行`jQuery.fx.tick`，清除setInterval

        jQuery.fx.stop = function() {
            clearInterval( timerId );
            timerId = null;
        };

3.  执行某个函数timer，并将这个函数压入`jQuery.timers`数组，然后执行`jQuery.fx.start()`

        jQuery.fx.timer = function( timer ) {
            if ( timer() && jQuery.timers.push( timer ) ) {
                jQuery.fx.start();
            }
        };

4.  `jQuery.fx.tick`，遍历执行timers数组中的函数。如果**函数返回值为假（false、undefined之类）**，则删除该函数。

        jQuery.fx.tick = function() {
            var timer,
                timers = jQuery.timers,
                i = 0;

            fxNow = jQuery.now();

            for ( ; i < timers.length; i++ ) {
                timer = timers[ i ];//取出每个timer（函数，jQuery.fx.timer 压入timers）
                // Checks the timer has not already been removed
                // 执行timer，返回结果为false、undefined之类的
                // 则把timer从timers数组中删除
                if ( !timer() && timers[ i ] === timer ) {
                    timers.splice( i--, 1 );
                }
            }

            // timers为空数组，则执行stop
            if ( !timers.length ) {
                jQuery.fx.stop();
            }
            fxNow = undefined;
        };



###动画之总结

前面的内容其实是边看源码边写的，所以有的函数没解释，顺序也不一定是适合新手的（有的函数用到了，但前面还没出现或者解释过），而这一段总结，则是初步看完了animation模块后写的，相信更易于理解，也更全面。

####动画添加流程

1.  首先是调用jQuery.fn.animate接口。在这里，为方便和清楚，举例：
        
        $('#book').animate({
            width: ['toggle', 'swing'],
            left: '+=50',
            height: 'toggle'
        }, 5000, function() {
            console.log('animation complete')
        });

2.  分解、修正除props（属性）外的参数（jQuery.speed）

    前面已有说明，现在简单说3点：

    *   注意参数，`jQuery.speed = function( speed, easing, fn )`，speed可以是2000等数字，或者是'slow'字符串，也可能是包括duration、easing、complete等所有属性的对象。
    *   `jQuery.fx.off`一般情况下是undefined，即未定义，一旦设置成'true'，那么duration设置为0，即清除所有动画。
    *   speed把参数修复组合成对象返回，该对象有duration、easing、complete、queue（值为"fx"）、old等属性。其中old指向原complete函数，complete属性则是包装后的old。**complete尤其要注意，因为不仅执行old，还执行dequeue。**

        opt.complete = function() {
            if ( jQuery.isFunction( opt.old ) ) {
                opt.old.call( this );
            }

            if ( opt.queue ) {
                jQuery.dequeue( this, opt.queue );
            }
        };

3.  重点来了，在修正参数后，jQuery.fn.animate定义了doAnimation函数，然后在返回时执行了函数：

        return empty || optall.queue === false ?
            this.each( doAnimation ) :
            this.queue( optall.queue, doAnimation );

    很明显，动画处理的核心是函数doAnimation，而`this.each`或`this.queue`是真正开始执行。

    *   `this.each`很好理解，就是为每个元素执行doAnimation。
    *   `this.queue`可以看队列queue这一章，那么，我们可以知道，queue加入队列后，doAnimation会被立即dequeue并执行。


####动画执行流程

添加动画应该是很清楚了，动画的执行核心在doAnimation函数，现在分析执行流程。

    doAnimation = function() {
        // Operate on a copy of prop so per-property easing won't be lost
        var anim = Animation( this, jQuery.extend( {}, prop ), optall );

        // Empty animations, or finishing resolves immediately
        // 属性为空，直接resolve
        if ( empty || data_priv.get( this, "finish" ) ) {
            anim.stop( true );
        }
    };
    doAnimation.finish = doAnimation;

doAnimation执行时首先创建了一个Animation对象anim；然后是个判断，是否要执行stop；最后为doAnimation添加一个finish属性。

好吧，显然创建anim就是动画执行的过程，现在分析Animation对象：

1.  中规中矩的一堆初始化。
    *   tick函数很显然，就是动画的每一帧：计算当前时间，计算当前百分比，计算对应的状态值，设置这个值，触发process事件，结束时触发done事件。

        当然，要看到**设置值是通过tween对象执行**。

2.  初始化中的animation对象。为什么单独拎出来？因为这个animation就是最后返回的对象，即Animation最终构造的对象。

    一堆属性，其中几个要特别注意：
    1.  `tweens: [],`，可以看到，tick中就是遍历animation.tweens，设置当前状态值的（run函数，参数是相同的百分数percent）；
    2.  `createTween: function( prop, end ) {}`函数，根据每个属性prop的名值对（prop、end）创建一个Tween对象，压入tweens；
    3.  `stop: function( gotoEnd )`很简单，直接执行最后一帧，然后触发done或fail事件。

3.  执行propFilter。propFilter就是对属性的处理：驼峰式、padding等的扩展、取出混合在props中的各个属性对应的easing等。

4.  执行defaultPrefilter。

        result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );

    先讲一下参数：defaultPrefilter中this指向animation，opts是animation.opts（有propFilter填充的specialEasing（css属性钩子））。

    defaultPrefilter主要做了：
    1.  `!opts.queue`为真的特殊处理，主要是保证最后执行`hooks.empty.fire()`；
    2.  宽高属性的特殊处理，例如把inline改成inline-block等。
    3.  属性的值是toggle、show、hide的特殊处理：从props中删除该属性，添加到orig对象，值为`dataShow && dataShow[ prop ] || jQuery.style( elem, prop );`
    4.  处理orig对象，其实也就是值为toggle等等的属性。

5.  执行`jQuery.map( props, createTween, animation );`。
    
    createTween是`createTween( value, prop, animation )`，把参数对照一下：

    *   value——props[prop]，是props属性对象内某个属性的**值**；

    *   prop——对应的属性名；

    *   animation——map中的第三个参数。

    createTween调用了`tweeners[ "*" ][0]`，除了创建属性名值对对应的tween对象，做了更多的处理工作：修正tween.start和tween.end（动画开始时属性的值和结束时属性的值）。

6.  动画开始前触发事件start，就是执行挂载到start熟悉的函数。

        //动画开始前触发的函数
        if ( jQuery.isFunction( animation.opts.start ) ) {
            animation.opts.start.call( elem, animation );
        }

7.  核心，调用`jQuery.fx.timer`正式开始执行动画。把tick作为参数传入，

        jQuery.fx.timer = function( timer ) {
            if ( timer() && jQuery.timers.push( timer ) ) {
                jQuery.fx.start();
            }
        };

    1.  tick在动画没完成前返回remaining（非0数字），显然if判断通过，执行`jQuery.fx.start`。
    2.  `jQuery.fx.start`直接调用setInterval来执行`jQuery.fx.tick`；
    3.  tick干什么的？遍历整个timers数组中每个函数执行一次，如果函数返回false之类的则删除。如果timers数组长度为0则调用`jQuery.fx.stop()`清除setInterval。即动画执行完毕。
    4.  tick每次只遍历timers函数数组执行一次，然后在setInterval作用下每过n秒执行一下，这就是动画的精髓了。某个函数执行到最后时返回false，tick就删除该函数了，最后都删完，那么就clearInterval。


8.  把process、done/complete、fail、always等函数加入到对应的函数队列，因为动画是setInterval来执行的，按异步原则，其实这些函数是在动画执行前被加入了。


###结束

本篇是jQuery动画模块的详细介绍，动画的原理很简单，但兼容性处理的代码有些晦涩难懂。