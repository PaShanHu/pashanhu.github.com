---
layout: default
title: 学习jQuery源码-样式操作之addClass
category: tech
tags: [jQuery, source code, css]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第13章，主要分析jQuery如何添加/删除/toggle样式类,当然，也算是jQuery样式操作模块的开端吧。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###样式操作的API

jQuery提供了一些API来操作css样式，API如下：

*   .addClass()：对元素的样式操作,底层的实现就是修改元素的className值。
*   .hasClass() 为匹配的元素集合中的每个元素中移除一个属性（attribute）。
*   .removeClass()为集合中匹配的元素删除一个属性（property）。
*   .toggleClass()获取匹配的元素集合。

现在开始分析每个API：

####.addClass( className )

#####函数介绍

描述：为每个匹配的元素添加指定的样式类名。

功能：

*   增加一个样式名： .addClass('class1')
*   增加多个样式名： .addClass('class1 class2')
*   传入函数，为每个匹配元素分别设置样式名：

        $("ul li:last").addClass(function(index) {
            return "item-" + index;
        });// 给定一个有2个<li>元素的无序列表，则将在最后一个<li>元素上加上"item-1"样式。

#####源码分析

    // 为匹配的每个元素增加指定的class(es)
    addClass: function( value ) {
        var classes, elem, cur, clazz, j,
            i = 0,
            len = this.length,
            // value是字符串，则proceed赋值value，
            // 否则proceed=false
            proceed = typeof value === "string" && value;

        // 如果传递的是回调函数，递归调用
        if ( jQuery.isFunction( value ) ) {
            return this.each(function( j ) {
                // 回调函数获得的参数是 元素index， 元素已有className
                jQuery( this ).addClass( value.call( this, j, this.className ) );
            });
        }

        if ( proceed ) {
            // The disjunction here is for better compressibility (see removeClass)
            // 通过正则/\S+/g 分组，按空格切分样式名
            classes = ( value || "" ).match( core_rnotwhite ) || [];

            for ( ; i < len; i++ ) {
                elem = this[ i ];
                //如果元素本身存在class样式，先取出来
                cur = elem.nodeType === 1 && ( elem.className ?
                    ( " " + elem.className + " " ).replace( rclass, " " ) :
                    " "
                );
                //""等于false；但" "却等于true
                if ( cur ) {
                    j = 0;
                    while ( (clazz = classes[j++]) ) {//遍历取出所有样式名
                        if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
                            cur += clazz + " ";//不存在该样式，则加入
                        }
                    }
                    elem.className = jQuery.trim( cur );//设置新样式

                }
            }
        }

        return this;
    },

代码可简要分为5步：

1.  参数value是函数，递归调用；
2.  用空格切分样式为数组；
3.  获取当前样式并取出来；
4.  组合样式数组成新样式名；
5.  通过className 设置新的样式。

代码清晰简单，现在重点讲一下传入回调函数怎么处理的？

    if ( jQuery.isFunction( value ) ) {
        return this.each(function( j ) {
            jQuery( this ).addClass( value.call( this, j, this.className ) );
        });
    }

this.each遍历当前元素集，给回调函数传入参数 当前元素index， 当前元素的className，获取回调函数返回值作为新的value，然后递归调用addClass。

####.removeClass( \[className\] )

描述: 移除集合中每个匹配元素上一个，多个或全部样式。

    removeClass: function( value ) {
        var classes, elem, cur, clazz, j,
            i = 0,
            len = this.length,
            proceed = arguments.length === 0 || typeof value === "string" && value;

        if ( jQuery.isFunction( value ) ) {
            return this.each(function( j ) {
                jQuery( this ).removeClass( value.call( this, j, this.className ) );
            });
        }
        if ( proceed ) {
            classes = ( value || "" ).match( core_rnotwhite ) || [];

            for ( ; i < len; i++ ) {
                elem = this[ i ];
                // This expression is here for better compressibility (see addClass)
                cur = elem.nodeType === 1 && ( elem.className ?
                    ( " " + elem.className + " " ).replace( rclass, " " ) :
                    ""
                );

                if ( cur ) {
                    j = 0;
                    while ( (clazz = classes[j++]) ) {
                        // Remove *all* instances
                        while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
                            cur = cur.replace( " " + clazz + " ", " " );
                        }
                    }
                    elem.className = value ? jQuery.trim( cur ) : "";
                }
            }
        }

        return this;
    },

代码与addClass很相似，不再累述。但要注意一点，`elem.className = value ? jQuery.trim( cur ) : "";`设置新样式很巧妙，先判断了value，value不存在，则删除全部样式名。

####.hasClass( className )

描述: 确定任何一个匹配元素是否有被分配给定的（样式）类。

    hasClass: function( selector ) {
        var className = " " + selector + " ",
            i = 0,
            l = this.length;
        for ( ; i < l; i++ ) {
            // 必须是Element，技巧同样是前后加空格，同样是indexOf
            if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
                return true;
            }
        }

        return false;
    },

代码简单，就2个点说一下：

*   当前元素集中有一个元素有该class就返回true；
*   `rclass = /[\t\r\n\f]/g`，该正则就是把 制表符、换行符等换成空格" "。

####.toggleClass( className )

描述: 在匹配的元素集合中的每个元素上添加或删除一个或多个样式类,取决于这个样式类是否存在或值切换属性。即：如果存在（不存在）就删除（添加）一个类。

toggleClass()接受一个或多个class；自从jQuery1.4以后，如果没有为.toggleClass()指定参数，元素上的所有class名称将被切换。

    toggleClass: function( value, stateVal ) {
        var type = typeof value;

        // 是否有开关，有的话直接按开关添加/删除样式
        if ( typeof stateVal === "boolean" && type === "string" ) {
            return stateVal ? this.addClass( value ) : this.removeClass( value );
        }

        if ( jQuery.isFunction( value ) ) {
            return this.each(function( i ) {
                jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
            });
        }

        return this.each(function() {
            if ( type === "string" ) {
                // toggle individual class names
                var className,
                    i = 0,
                    self = jQuery( this ),
                    classNames = value.match( core_rnotwhite ) || [];

                while ( (className = classNames[ i++ ]) ) {
                    // check each className given, space separated list
                    if ( self.hasClass( className ) ) {
                        self.removeClass( className );
                    } else {
                        self.addClass( className );
                    }
                }

            // Toggle whole class name
            // toggle所有样式
            } else if ( type === core_strundefined || type === "boolean" ) {
                if ( this.className ) {
                    // store className if set
                    // 存储当前的样式
                    data_priv.set( this, "__className__", this.className );
                }

                // 元素有样式名或者传参false，删除所有样式
                // 否则从前面存储的恢复，若没有存储，则置为""
                this.className = this.className || value === false ? "" : data_priv.get( this, "__className__" ) || "";
            }
        });
    },

toggleClass就是addClass、removeClass、hasClass的综合运用。


###结束

本篇是jQuery的css操作的样式名操作，也就是addClass、removeClass、hasClass及toggleClass四个函数。下一篇继续分析jQuery的css操作。