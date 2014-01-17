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

###jQuery选择器入门

选择器，是jQuery的基石。

我相信，jQuery如此流行的最重要原因就是它强大而便捷的选择器。全面的css/css3语法支持，准确定位到每一个元素，jQuery极大地提高了获取、筛选元素的效率。

####从正则rquickExpr说起

说高效强大莫如正则，jQuery中运用了大量的正则来判断、切分字符串。现在说一说选择器中用到的rquickExpr。

    rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

分解一下：

1.  `|`之前：`^(?:\s*(<[\w\W]+>)[^>]*`

    *   \s* : 匹配任何空白字符，包括空格、制表符、换页符等等 零次或多次
    *   [\w\W]+ : 匹配'[A-Za-z0-9_]'或[^A-Za-z0-9_]' 一次或多次
    *   [^>]：除了>的任意字符 零次或多次

    这半截是匹配 "<p>"这样的，前面可加任意空白符，"<>"内可以是任意字符，后面可以是任意字符。

2.  `|`之后：#([\w-]*))$/

    匹配以#号开始，'[A-Za-z0-9_-]'出现任意次结尾的字符串。

例子：

    rquickExpr.exec(' < > hi')  // 输出  [" < > hi", "< >", undefined]

    rquickExpr.exec(' <p>text</p>')  // 输出  [" <p>text</p>", "<p>text</p>", undefined]

    rquickExpr.exec('#hi-hello')  // 输出  ["#hi-hello", undefined, "hi-hello"]

    rquickExpr.exec('#    hi-hello')  // 输出  null

综合一下，rquickExpr就是匹配html标记（前后可有空白）或者"#id"形式的id（前后不可空白）。

####init函数分析

init其实是选择器的第一道接口，本身处理一些简单的选择器，更复杂的转交Sizzle来处理。

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

<br/>

**分析：**

*init按参数selector来分别处理。*

1.  首先处理 `"",null,undefined,false` 返回this ，增加程序的健壮性
2.  其次处理字符串
3.  处理DOMElement，把context，this[0]置为selector（就是dom元素），设置length属性为1，返回this
4.  处理function。selector是function，其实就是把该函数绑定到document.ready事件。
5.  最后处理selector本身就是jQuery对象，那么复制一些属性即可。

<br/>

*具体分析selector是字符串怎么处理的。*

1.  填充match数组
    
    *   以`<`开始，`>`结尾 ，长度>=3，假设就是html标签，不用正则检查，直接match = [ null, selector, null ];
    *   否则`match = rquickExpr.exec( selector );`

2.  如果match存在并且  match[1]存在或者参数context不存在，则，

    *   如果是match[1]存在（说明是HTML标记），用`jQuery.merge`把match[1]转换而来的dom元素（组）合并到this。

        如果match[1]是纯HTML标签（如`<div></div>`），并且context是纯js对象，那么，这就是这种形式了：`$(html, props)`。这是把DOM属性（property）添加到该DOM。

        比如：`$('<body>',{width:'100px'})`，那么返回：`[<body style=​"width:​ 100px;​">​</body>​]`，即创建一个新的dom元素body（与当前文档中的body没有关系）。当然，这个"100px"也可以是函数。

        最后返回this。**其实是用HTML标记创建了dom元素添加到this，然后返回包装过的jQuery对象this。**

    *   match[1]不存在（说明context不存在），这是selector是id形式了。使用`document.getElementById`来获取该dom元素并赋给this[0]，设置this.context等属性后返回this。


3.  match不存在，说明不是HTML标记或ID表达式，即是复杂表达式。

    *   如果context不存在或者context是jQuery对象：

            return ( context || rootjQuery ).find( selector );

    *   否则

            return this.constructor( context ).find( selector );

    这两种情况调用了Sizzle来处理。（`jQuery.find = Sizzle;`）

###结束

本篇是选择器的初步介绍，或者说接触到了选择器，其实都是一些简单的selector处理，处理复杂的selector的Sizzle只是露了个面。下一章开始介绍Sizzle。