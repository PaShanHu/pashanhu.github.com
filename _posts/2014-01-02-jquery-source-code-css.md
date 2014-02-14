---
layout: default
title: 学习jQuery源码-样式操作之css函数及其钩子
postDate: 2014-01-02
tags: [jQuery, source code, css]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###.css()函数

####API介绍

获取匹配元素集合中的第一个元素的样式属性的值 或 设置每个匹配元素的一个或多个CSS属性。

这是css操作的核心API，常见的有四种用法：

*   读取样式  .css( propertyName )
        描述: 获取匹配元素集合中的第一个元素的样式属性的值
        1.  .css( propertyName )
        2.  .css( propertyNames )
*   设置样式  .css( propertyName, value )
        1.  .css( propertyName, value )
        2.  .css( propertyName, function(index, value) )
        3.  .css( properties )

*   .addClass()：对元素的样式操作,底层的实现就是修改元素的className值。
*   jQuery.cssHooks
*   .hasClass() 为匹配的元素集合中的每个元素中移除一个属性（attribute）。
*   .removeClass()为集合中匹配的元素删除一个属性（property）。
*   .toggleClass()获取匹配的元素集合。

例子：

    <div id="header"></div>
    <ul id="list">
        <li></li> <li></li> <li></li>
    </ul>

---

    $('#header').css('height');  //读取样式值
    $('#header').css('height', '10px');  //设置样式值
    $('#header').css({height:'20px', 'width':'20px'});  //通过map方式设置多个属性
    $('#list li').css('height', function(index, oldValue){ 
        //通过传入function来设置样式，常用于集合操作
    　　//index：为对应集合元素的索引，从0开始；oldValue：元素原先样式
        return index*10+'px';  //返回值：节点最终设置的样式值
    });

####相关代码简介

#####主要代码：

*   jQuery.fn.css  //对外接口，样式读取、设置都通过它完成
*   jQuery.access  //jQuery.fn.css内部调用的，完成样式的读取、设置
*   jQuery.css  //读取节点样式（实际渲染后）
*   jQuery.style  //读取节点样式（内联样式）、设置节点样式
*   curCSS  //浏览器内置获取节点样式方法，为（1）支持标准的浏览器：getComputedStyle （2）IE系列：currentStyle

#####支持函数：

*   jQuery.cssHooks  //钩子函数，某些样式，如'height'、'width'等用到
*   jQuery.support  //浏览器对某些特性的支持，详情见下文
*   jQuery.swap  //节点隐藏等情况下，height、width等获取值不准，此时需利用此方法来获得准确值，详情见下文
*   jQuery.cssProps  //某些属性，在浏览器里有各自的别名，如float：IE里为styleFloat，遵守标准的浏览器里为cssFoat，详情见下文
*   jQuery.cssNumber  //某些属性，如z-index，为数值类型，不需要单位，详情见下文

#####相关正则：

详情见下文

####源码分析

#####1、jQuery.fn.css——css操作的接口

    css: function( name, value ) {
        //此处需要比较需要关心的是 function( elem, name, value ) 这个匿名方法
        //在jQuery.access经过各种判断检测后，最终就是调用这个匿名方法，遍历this，进行样式读取、设置
        return jQuery.access( this, function( elem, name, value ) {
            //elem：设置/读取样式的节点
            //name：样式名
            //value：样式值
            var styles, len,
                map = {},
                i = 0;

            if ( jQuery.isArray( name ) ) {
                styles = getStyles( elem );
                len = name.length;

                for ( ; i < len; i++ ) {
                    map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
                }

                return map;
            }

            return value !== undefined ?
                jQuery.style( elem, name, value ) ://设置样式
                jQuery.css( elem, name );//读取样式
        }, name, value, arguments.length > 1 );
    },

**分析：**

*   jQuery.fn.css直接调用了jQuery.access方法。jQuery.access方法再次出现，我们在attr、prop时已经用到过。网上有称jQuery.access为来自地狱的代码，至少解读源码时的确令人烦躁。
*   搞清怎么调用的，也就是搞清传递的参数：1--this，2--function，3--name，4--value，5--boolean；
*   第二个参数fn传递的是函数，即上面的function( elem, name, value ){}，它是干什么的？

    *   参数name不是数组时，根据value来判断，value存在，返回jQuery.style函数；否则返回jQuery.css函数；

    *   参数name是数组，则返回对象map。比如说

            $(document.body).css(['width','height'],null);
            
            则map是

            Object {width: "960px", height: "94px"} //测试页面body宽960px，高94px。

        可见，map就是*name数组元素与其对应css属性组成的对象。*

<br/>

#####2、jQuery.access——由jQuery.fn.css直接调用

    // 参数描述
    // elems ：dom元素，读取/设置 样式的dom元素
    // fn ：对节点操作的函数，这里是（1）读取：jQuery.css（elem） （2）设置jQuery.style(elem,key,value)
    // key ：读取/设置样式对应的属性名，如.css('height')，则key === 'height'
    // value ：值，如.css('height','200px')，则value === '200px'
    // chainable : 是否需要返回jQuery对象实现链式调用。
    // emptyGet ：css未用到。
    // raw ：css未用到。

    jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
        var i = 0,
            length = elems.length,
            bulk = key == null;//key是null或undefined，则bulk=true;

        // Sets many values
        if ( jQuery.type( key ) === "object" ) {
            // key 为对象，表明这是一个类似于 {'height':'100px', 'width':'200px'}的(多个)键值对
            // 多个键值表明是设置css属性，可以链式调用，所以设置chainable为true
            chainable = true;
            for ( i in key ) {//递归调用
                jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
            }

        // Sets one value
        } else if ( value !== undefined ) {
            // value 存在，表明是设置css属性，可以链式调用，所以设置chainable为true
            chainable = true;

            if ( !jQuery.isFunction( value ) ) {
                raw = true; // value不是函数，设raw为true
            }

            // key是null或undefined，css用不到，忽略
            if ( bulk ) {
                ...
            }

            //fn存在，开始调用
                // jQuery.style( elem, name, value )  //设置样式
                // jQuery.css( elem, name )  //读取样式
            if ( fn ) {
                for ( ; i < length; i++ ) {
                    fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
                }
            }
        }

        return chainable ?
            //chainable为true，则是链式调用，返回的就是元素集合本身。
            elems :

            //如果不是链式调用，那么就是获取css属性
            bulk ?//bulk 为 true，说明key为null或undefined，调用fn；
                fn.call( elems ) :

                // key存在，判断elems的长度，长度为0，返回默认值emptyGet
                // 长度>=1，表明存在元素，调用jQuery.css来获取css属性
                length ? fn( elems[0], key ) : emptyGet;
    };

**分析：**

*   前面是例行的初始化，然后判断key，如果key是对象，则递归调用access。

    比如`$(el).css({'height':'100px', 'width':'200px'})`，key就是对象，然后分解为key='height'，value='100px'和key='width'，value='200px'调用2次access。

*   然后判断value。这里打断一下，先搞清chainable的值：
    
    *   传参时的值：jQuery.fn.css中调用access并传参，chainable是arguments.length > 1。所以`jQuery.fn.css('name',null/undefined/' '等任意值)`，chainable都是true；但`jQuery.fn.css('name')`，chainable是false。
    *   key为对象，则chainable设为true；value不是undefined，则chainable设为true。

*   回到判断value。value存在，为元素集中每个元素执行fn；此时，参数是elems[i]，key，value（是函数则是执行过后返回的值），最后一个参数忽略，因为fn用不到。

*   value不存在（调用时未传参），直接跳到最后的return。此时chainable一般false，length=1，所以返回函数fn( elems[0], key )执行结果。

这样，流程应该清晰了，但要强调一下，设置属性时，`value!== undefined`判断通过，if分支里已经为每个elem设置了css属性，但最后返回的是elems以便链式调用。而获取css属性时，最后的返回才执行fn函数，最终返回值是fn执行结果：对应的css属性。

#####3、jQuery.css——真正执行获取css属性的函数

    css: function( elem, name, extra, styles ) {
        var val, num, hooks,
            //转成驼峰形式，如margin-left --> marginLeft
            origName = jQuery.camelCase( name );

        // Make sure that we're working with the right name
        // 对某些特殊属性，如float进行修正
        name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

        // gets hook for the prefixed version
        // followed by the unprefixed version
        //某些特定的属性有对应的get、set方法，如'height'、'width'、'opacity'等
        hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

        // If a hook was provided get the computed value from there
        //如果有对应的hook对象，且该对象有get方法，则调用hooks[name].get 来获取样式值
        if ( hooks && "get" in hooks ) {
            val = hooks.get( elem, true, extra );
        }

        // Otherwise, if a way to get the computed value exists, use that
        //否则，通过curCSS方法来获取实际渲染后的样式值
        if ( val === undefined ) {
            val = curCSS( elem, name, styles );
        }

        //convert "normal" to computed value
        if ( val === "normal" && name in cssNormalTransform ) {
            val = cssNormalTransform[ name ];
        }

        // Return, converting to number if forced or a qualifier was provided and val looks numeric
        if ( extra === "" || extra ) {
            num = parseFloat( val );
            return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
        }
        return val;
    }

jQuery.css就是获取指定的css属性，逻辑很简单。首先对name进行兼容性处理；尝试用钩子获取name指定的属性；失败的话尝试curCSS获取渲染后的样式值；其它处理并返回值。

兼容性处理在后面，现在先不讲。

#####4、jQuery.style——真正执行设置css属性的函数

    // Get and set the style property on a DOM Node
    style: function( elem, name, value, extra ) {
        // Don't set styles on text and comment nodes
        //elem.nodeType ==> 3：文本,8：注释，此处过滤文本、注释节点
        //elem为document，则document.style == undefined，过滤无法设置属性的节点
        if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
            return;
        }

        // Make sure that we're working with the right name
        var ret, type, hooks,
            origName = jQuery.camelCase( name ),//返回驼峰命名形式的属性名
            style = elem.style;

        name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

        // gets hook for the prefixed version
        // followed by the unprefixed version
        hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

        // Check if we're setting a value
        if ( value !== undefined ) {
            type = typeof value;

            // convert relative number strings (+= or -=) to relative numbers. #7345
            //采用相对值进行设置，如$(node).css('height','+=10px')
            //ret = rrelNum.exec( value )，如采用相对值进行设置，则：
            //ret[1]：+/-
            //ret[2]：相对值的大小
            if ( type === "string" && (ret = rrelNum.exec( value )) ) {
                //将相对值与原来的属性值进行运算，获得实际设置的值
                value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
                // ret[1] + 1运算值是字符串"+1"或"-1"
                // *等四则运算时自动传化为数字
                // Fixes bug #9237
                type = "number";
            }

            // Make sure that NaN and null values aren't set. See: #7116
            //如果设置的值为 null 或者 NaN，则不设置，直接返回
            if ( value == null || type === "number" && isNaN( value ) ) {
                return;
            }

            // If a number was passed in, add 'px' to the (except for certain CSS properties)
            //如果传进来的值是number类型，如.css('height',10)，则给10加上单位px
            if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
                value += "px";
            }

            // Fixes #8908, it can be done more correctly by specifying setters in cssHooks,
            // but it would mean to define eight (for every problematic property) identical functions
            if ( !jQuery.support.clearCloneStyle && value === "" && name.indexOf("background") === 0 ) {
                style[ name ] = "inherit";
            }

            // If a hook was provided, use that value, otherwise just set the specified value
            //如果该属性存在对应钩子对象，且该对象有set方法，则调用刚set方法设置样式值
            if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
                style[ name ] = value;
            }

        } else {
            //如果value没有提供，则返回内联样式值

            // If a hook was provided get the non-computed value from there
            if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
                return ret;
            }

            // Otherwise just get the value from the style object
            return style[ name ];
        }
    },

#####5、curCSS——浏览器内置获取节点样式方法

    curCSS = function( elem, name, _computed ) {
        var width, minWidth, maxWidth,
            // 浏览器API获取elem的css样式：
            // CSSStyleDeclaration {0: "background-attachment", 1: "background-clip", 2...}
            computed = _computed || getStyles( elem ),

            // Support: IE9
            // getPropertyValue is only needed for .css('filter') in IE9, see #12537
            // 获取name指定的css属性值
            ret = computed ? computed.getPropertyValue( name ) || computed[ name ] : undefined,
            style = elem.style;

        if ( computed ) {
            //ret === ""并且elem存在elem.ownerDocument
            // 用jQuery.style重新获取name指定属性值（应该是用钩子之类的重新取值）
            if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
                ret = jQuery.style( elem, name );
            }

            // Support: Safari 5.1
            // A tribute to the "awesome hack by Dean Edwards"
            // Safari 5.1.7 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
            // this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
            // 对Safari 5.1在width上的兼容
            if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {

                // Remember the original values
                width = style.width;
                minWidth = style.minWidth;
                maxWidth = style.maxWidth;

                // Put in the new values to get a computed value out
                style.minWidth = style.maxWidth = style.width = ret;
                ret = computed.width;

                // Revert the changed values
                style.width = width;
                style.minWidth = minWidth;
                style.maxWidth = maxWidth;
            }
        }

        return ret;
    };

#####6、jQuery.cssHooks——css钩子函数

    cssHooks: {
        opacity: {
            // 透明度获取钩子
            // curCSS获取值是""时，修改为"1"
            get: function( elem, computed ) {
                if ( computed ) {
                    // We should always get a number back from opacity
                    var ret = curCSS( elem, "opacity" );
                    return ret === "" ? "1" : ret;
                }
            }
        }
    },

    // These hooks cannot be added until DOM ready because the support test
    // for it is not run until after DOM ready
    // dom加载完这些css钩子才添加
    jQuery(function() {
        // Support: Android 2.3
        if ( !jQuery.support.reliableMarginRight ) {
            jQuery.cssHooks.marginRight = {
                get: function( elem, computed ) {
                    if ( computed ) {
                        // Support: Android 2.3
                        // WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
                        // Work around by temporarily setting element display to inline-block
                        return jQuery.swap( elem, { "display": "inline-block" },
                            curCSS, [ elem, "marginRight" ] );
                    }
                }
            };
        }

        // Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
        // getComputedStyle returns percent when specified for top/left/bottom/right
        // rather than make the css module depend on the offset module, we just check for it here
        if ( !jQuery.support.pixelPosition && jQuery.fn.position ) {
            jQuery.each( [ "top", "left" ], function( i, prop ) {
                jQuery.cssHooks[ prop ] = {
                    get: function( elem, computed ) {
                        if ( computed ) {
                            computed = curCSS( elem, prop );
                            // if curCSS returns percentage, fallback to offset
                            return rnumnonpx.test( computed ) ?
                                jQuery( elem ).position()[ prop ] + "px" :
                                computed;
                        }
                    }
                };
            });
        }

    });

    // height、width的css钩子
    jQuery.each([ "height", "width" ], function( i, name ) {
        jQuery.cssHooks[ name ] = {
            get: function( elem, computed, extra ) {
                if ( computed ) {
                    // certain elements can have dimension info if we invisibly show them
                    // however, it must have a current display style that would benefit from this
                    return elem.offsetWidth === 0 && rdisplayswap.test( jQuery.css( elem, "display" ) ) ?
                        jQuery.swap( elem, cssShow, function() {
                            return getWidthOrHeight( elem, name, extra );
                        }) :
                        getWidthOrHeight( elem, name, extra );
                }
            },

            set: function( elem, value, extra ) {
                var styles = extra && getStyles( elem );
                return setPositiveNumber( elem, value, extra ?
                    augmentWidthOrHeight(
                        elem,
                        name,
                        extra,
                        jQuery.support.boxSizing && jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
                        styles
                    ) : 0
                );
            }
        };
    });

    // These hooks are used by animate to expand properties
    jQuery.each({
        margin: "",
        padding: "",
        border: "Width"
    }, function( prefix, suffix ) {
        jQuery.cssHooks[ prefix + suffix ] = {
            expand: function( value ) {
                var i = 0,
                    expanded = {},

                    // assumes a single number if not a string
                    parts = typeof value === "string" ? value.split(" ") : [ value ];

                for ( ; i < 4; i++ ) {
                    expanded[ prefix + cssExpand[ i ] + suffix ] =
                        parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
                }

                return expanded;
            }
        };

        if ( !rmargin.test( prefix ) ) {
            jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
        }
    });


    function getWidthOrHeight( elem, name, extra ) {

        // Start with offset property, which is equivalent to the border-box value
        var valueIsBorderBox = true,
            val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
            styles = getStyles( elem ),
            isBorderBox = jQuery.support.boxSizing && jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

        // some non-html elements return undefined for offsetWidth, so check for null/undefined
        // svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
        // MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
        if ( val <= 0 || val == null ) {
            // Fall back to computed then uncomputed css if necessary
            val = curCSS( elem, name, styles );
            if ( val < 0 || val == null ) {
                val = elem.style[ name ];
            }

            // Computed unit is not pixels. Stop here and return.
            if ( rnumnonpx.test(val) ) {
                return val;
            }

            // we need the check for style in case a browser which returns unreliable values
            // for getComputedStyle silently falls back to the reliable elem.style
            valueIsBorderBox = isBorderBox && ( jQuery.support.boxSizingReliable || val === elem.style[ name ] );

            // Normalize "", auto, and prepare for extra
            val = parseFloat( val ) || 0;
        }

        // use the active box-sizing model to add/subtract irrelevant styles
        return ( val +
            augmentWidthOrHeight(
                elem,
                name,
                extra || ( isBorderBox ? "border" : "content" ),
                valueIsBorderBox,
                styles
            )
        ) + "px";
    }

#####7、jQuery.cssProps——css钩子函数

    // Add in properties whose names you wish to fix before
    // setting or getting the value
    //某些属性，在浏览器里有各自的别名，如float：IE里为styleFloat，遵守标准的浏览器里为cssFoat
    cssProps: {
        // normalize float css property
        "float": "cssFloat"
    },

#####8、jQuery.support——浏览器对某些特性的支持

略。

#####9、jQuery.swap——修正获取值

节点隐藏等情况下，height、width等获取值不准，此时需利用此方法来获得准确值。

    // A method for quickly swapping in/out CSS properties to get correct calculations.
    // Note: this method belongs to the css module but it's needed here for the support module.
    // If support gets modularized, this method should be moved back to the css module.
    // 将offsetHeight、offsetWidth为0的元素快速修改样式，获得需要的值后，再改回去
    // elem dom节点
    // options {display:'block',position:'absolute',visibility:'hidden'}
    // callback 回调方法，如获取修改后的dom节点的宽、高等
    // args callback的参数
    swap: function( elem, options, callback, args ) {
        var ret, name,
            old = {};

        // Remember the old values, and insert the new ones
        for ( name in options ) {
            old[ name ] = elem.style[ name ];
            elem.style[ name ] = options[ name ];
        }

        ret = callback.apply( elem, args || [] );

        // Revert the old values
        for ( name in options ) {
            elem.style[ name ] = old[ name ];
        }

        return ret;
    }

#####10、jQuery.cssNumber——不要自动添加px单位

某些属性，如z-index，为数值类型，不需要单位。

    // Don't automatically add "px" to these possibly-unitless properties
    cssNumber: {
        "columnCount": true,
        "fillOpacity": true,
        "fontWeight": true,
        "lineHeight": true,
        "opacity": true,
        "order": true,
        "orphans": true,
        "widows": true,
        "zIndex": true,
        "zoom": true
    },

#####11、用到的正则

    var ralpha = /alpha\([^)]*\)/i,    //匹配如：alpha(opacity=20)
        ropacity = /opacity=([^)]*)/,    //匹配如：filter:alpha(opacity=20)等形式
        // fixed for IE9, see #8346
        rupper = /([A-Z]|^ms)/g,    //此处暂不明，但觉厉，需再探究下
        rnum = /^[\-+]?(?:\d*\.)?\d+$/i,    //匹配数字（包括浮点），如(+/-)1、(+/-)0.1、(+/-).1、(+/-)1.1
        rnumnonpx = /^-?(?:\d*\.)?\d+(?!px)[^\d\s]+$/i,    //非px值，如'10em'、'10%'等
        rrelNum = /^([\-+])=([\-+.\de]+)/,    //设置属性支持相对写法，如$('#header').css('height', '+=10px')等。。
        rmargin = /^margin/,    //属性是否为margin开头的，如margin-left、margin-top等

        cssShow = { position: "absolute", visibility: "hidden", display: "block" },    //对于offsetHeight或offsetWidth为0的元素

        // order is important!
        cssExpand = [ "Top", "Right", "Bottom", "Left" ],    //计算宽、高用到

        curCSS,    //最终只是把getComputedStyle或currentStyle方法其中之一赋给curCss

        getComputedStyle,    //遵守标准的浏览器获取css样式的方法
        currentStyle;    //IE浏览器获取css样式的方法

###结束

jQuery的css操作应该是将清楚了，不过针对浏览器兼容的钩子大多是摘录了源码而没有分析，一方面分析起来很麻烦。另一方面就是有的我也没搞懂啦 ;-) 。这些待以后再*更新补完*。下一篇开始jQuery的事件。