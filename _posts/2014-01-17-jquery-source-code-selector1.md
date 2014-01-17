---
layout: default
title: 学习jQuery源码-选择器1
postDate: 2013-01-17
tags: [jQuery, source code, selector]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###

####init

    init: function( selector, context, rootjQuery ) {
        
        var match, elem;

        // HANDLE: $(""), $(null), $(undefined), $(false)
        if ( !selector ) {
            return this;
        }

        // Handle HTML strings
        // 处理字符串 
        if ( typeof selector === "string" ) {
            //是 "<"开始，">"结尾 ，长度>=3，假设就是html标签，不用正则检查，直接match = [ null, selector, null ];
            if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
                // Assume that strings that start and end with <> are HTML and skip the regex check
                match = [ null, selector, null ];

            } else {//否则rquickExpr.exec
                match = rquickExpr.exec( selector );//必须是<htmltag>或者#id两种形式之一
            }

            // Match html or make sure no context is specified for #id
            // 匹配的html(<tag>)  或  确保没有上下文指定为 #id
            if ( match && (match[1] || !context) ) {

                // HANDLE: $(html) -> $(array)
                // match[1]（html标记）存在，处理$(html) -> $(array),也就是处理的是html方式
                if ( match[1] ) {
                    context = context instanceof jQuery ? context[0] : context;

                    // scripts is true for back-compat
                    // parseHTML，根据match[1]字符串转换为一组DOM元素
                    jQuery.merge( this, jQuery.parseHTML(
                        match[1],
                        context && context.nodeType ? context.ownerDocument || context : document,
                        true
                    ) );

                    // HANDLE: $(html, props)
                    // rsingleTag匹配一个独立的标签，没有任何属性和子节点的字符串；比如'<html></html>'或者'<div></div>'这样
                    if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
                        for ( match in context ) {
                            // Properties of context are called as methods if possible
                            if ( jQuery.isFunction( this[ match ] ) ) {
                                this[ match ]( context[ match ] );

                            // ...and otherwise set as attributes
                            } else {
                                this.attr( match, context[ match ] );
                            }
                        }
                    }

                    return this;

                // HANDLE: $(#id) 处理id
                } else {
                    elem = document.getElementById( match[2] );

                    // Check parentNode to catch when Blackberry 4.6 returns
                    // nodes that are no longer in the document #6963
                    if ( elem && elem.parentNode ) {
                        // Inject the element directly into the jQuery object
                        this.length = 1;
                        this[0] = elem;
                    }

                    this.context = document;
                    this.selector = selector;
                    return this;
                }

            // HANDLE: $(expr, $(...))
            // <htmltag>或者#id情况在上面已被处理，复杂的selector表达式（如div > input#name）之类的在下面处理
            } else if ( !context || context.jquery ) {

                return ( context || rootjQuery ).find( selector );

            // HANDLE: $(expr, context)
            // (which is just equivalent to: $(context).find(expr)
            } else {
                return this.constructor( context ).find( selector );
            }

        // HANDLE: $(DOMElement) 处理dom元素
        } else if ( selector.nodeType ) {
            this.context = this[0] = selector;
            this.length = 1;
            return this;

        // HANDLE: $(function)
        // Shortcut for document ready   选择器为函数，则是jQuery.ready的快捷写法
        } else if ( jQuery.isFunction( selector ) ) {
            return rootjQuery.ready( selector );
        }

        // selector是jQuery对象
        if ( selector.selector !== undefined ) {
            this.selector = selector.selector;
            this.context = selector.context;
        }

        return jQuery.makeArray( selector, this );
    },

**分析：**

1.  

###结束

本篇是jQuery动画模块的前置模块队列queue，代码不多，也简单。下一篇正式分析jQuery的动画。