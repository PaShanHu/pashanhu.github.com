---
layout: default
title: 学习jQuery源码-css相关API解读
category: tech
tags: [jQuery, source code, queue]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第21章，补充了jQuery样式操作模块没有讲的地方，即一些简化的样式操作API。</p>
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###为什么写这一章？

其实之前的两篇关于css操作的文章已经把css相关的最核心内容解析了，这篇解读的都是细枝末节或者是底层函数的再包装。不过因为解读动画模块，又用到了这些API，所以干脆就专门写一章解读一下。

这些API有的很独立，有的在很多地方都用到，但基本都小巧而精致。现在从一组操作元素可见性的API开始吧。

###元素可见性API

####isHidden( elem, el )

isHidden判断元素是否可见。

    function isHidden( elem, el ) {
        // isHidden might be called from jQuery#filter function;
        // in that case, element will be second argument
        // jQuery#filter调用时元素是第二个参数
        elem = el || elem;
        return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
    }

**分析：**

元素本身display属性为none，这是显而易见的不可见。return中前面的判断就是检查元素display属性；后面的判断是在前面不成立时进行：elem是正常的元素节点（不是document）则false，否则true。


####showHide( elements, show )

元素可见性切换的真正实现。

	function showHide( elements, show ) {
	    var display, elem, hidden,
            values = [],
            index = 0,
            length = elements.length;

        // 遍历每个元素，缓存display样式
        for ( ; index < length; index++ ) {
            elem = elements[ index ];
            if ( !elem.style ) {
                continue;
            }

            values[ index ] = data_priv.get( elem, "olddisplay" );
            display = elem.style.display;

            if ( show ) {// 显示
                // Reset the inline display of this element to learn if it is
                // being hidden by cascaded rules or not
                // 如果没有缓存的默认display样式
                // 设置内联样式表：elem.style.display = "";这样就能在下一个if中判断出是否是被
                // 级联css设置为display none
                if ( !values[ index ] && display === "none" ) {
                    elem.style.display = "";
                }

                // Set elements which have been overridden with display: none
                // in a stylesheet to whatever the default browser style is
                // for such an element
                // 如果元素是被样式文件（级联css）重写了display none（内联样式是elem.style.display === ""）
                // 获取元素默认display样式并缓存
                if ( elem.style.display === "" && isHidden( elem ) ) {
                    values[ index ] = data_priv.access( elem, "olddisplay", css_defaultDisplay(elem.nodeName) );
                }
            } else {
                // show不存在，即隐藏，如果没有缓存默认display，则缓存。
                if ( !values[ index ] ) {
                    hidden = isHidden( elem );
                    // display存在且不是'none'(display不是""/"none")，或者elem可见，则缓存元素display样式
                    // 元素elem不可见：就是（style获取的）display；元素可见，通过css获取元素的display样式
                    if ( display && display !== "none" || !hidden ) {
                        data_priv.set( elem, "olddisplay", hidden ? display : jQuery.css(elem, "display") );
                    }
                }
            }
        }

        // Set the display of most of the elements in a second loop
        // to avoid the constant reflow
        // 真正的设置display样式来隐藏或显示
        for ( index = 0; index < length; index++ ) {
            elem = elements[ index ];
            if ( !elem.style ) {
                continue;
            }
            if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
                //show(转为可见)？是就获取values[ index ]或者设为"",
                //否则设为none（隐藏）。
                elem.style.display = show ? values[ index ] || "" : "none";
            }
        }

        return elements;
	}

源码不复杂，分析都在注释中。需要强调的是，从源码来看，如果show **祖先元素不可见的元素** ，是不做任何操作的，即jQuery未提供这种功能。

####show、hide、toggle

这是showHide函数的包装，用户真正使用的接口。

	jQuery.fn.extend({

		show: function() {
		    return showHide( this, true );
	    },
	    hide: function() {
	        return showHide( this );
	    },
	    toggle: function( state ) {
	        if ( typeof state === "boolean" ) {
	            return state ? this.show() : this.hide();
	        }

	        return this.each(function() {
	            if ( isHidden( this ) ) {
	                jQuery( this ).show();
	            } else {
	                jQuery( this ).hide();
	            }
	        });
		}

源码一目了然，不解释。



###结束

本篇是jQuery动画模块的前置模块队列queue，代码不多，也简单。下一篇正式分析jQuery的动画。