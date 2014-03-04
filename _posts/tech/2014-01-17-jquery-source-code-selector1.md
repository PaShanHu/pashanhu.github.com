---
layout: default
title: 学习jQuery源码-选择器1——从init函数开始的初步分析
category: tech
tags: [jQuery, source code, selector]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第2章，本章是选择器的入门，主要讲了在init函数中是如何用到选择器的，以及一个简单的正则rquickExpr。</p><p>init函数（jQuery.fn.init）是创建jQuery时必然调用的函数，接收selector参数，该参数会传给Sizzle引擎来获取正确的DOM对象，本章会详细来分析阐述。</p>
---

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

    这半截是匹配 `<p>` 这样的，前面可加任意空白符，`<>`内可以是任意字符，后面可以是任意字符。

2.  `|`之后：`#([\w-]*))$/`

    匹配 以`#`号开始，结尾是`[A-Za-z0-9_-]`出现任意次，如 `#idExpress`。

例子：

    rquickExpr.exec(' < > hi');  
    // 输出  [" < > hi", "< >", undefined]

    rquickExpr.exec(' <p>text</p>');  
    // 输出  [" <p>text</p>", "<p>text</p>", undefined]

    rquickExpr.exec('#hi-hello');  
    // 输出  ["#hi-hello", undefined, "hi-hello"]

    rquickExpr.exec('#    hi-hello');  
    // 输出  null

*综合一下，rquickExpr就是匹配html标记（`<`前可有空白，`>`后可以有任意字符）或者"#id"形式的id表达式（前后不可空白）。*

####jQuery.fn.init函数分析

`jQuery.fn.init`其实是选择器的第一道接口，本身处理一些简单的选择器，更复杂的转交Sizzle来处理。

    // jQuery.fn.init函数
    
    init : function( selector, context, rootjQuery ) {
        
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
    }

<br/>

**分析：**

*   init分析参数selector并做不同处理：

    1.  首先处理 `"",null,undefined,false` 返回this ，增加程序的健壮性；
    2.  其次处理字符串（较复杂，分析见下面）；
    3.  处理DOMElement，把context，this[0]置为selector（就是dom元素），设置length属性为1，返回this；
    4.  处理function。selector是function，其实就是把该函数绑定到document.ready事件；
    5.  最后处理selector本身就是jQuery对象，那么复制一些属性即可。

*   selector是字符串的具体处理：

    1.  构造填充match数组
        
        *   以`<`开始，`>`结尾 ，长度>=3，就可以假设selector是html标签，省略正则检查，直接`match = [ null, selector, null ];`
        *   否则对selector正则处理：`match = rquickExpr.exec( selector );`

    2.  判断分析match并分别处理。

        jQuery把selector是字符串**按3种情况**来处理，当然这是分析由selector处理而来的match数组得出的3种情况。

        我们看第一个if分支，`if ( match && (match[1] || !context) )`，这行代码很有意思：

        如果match存在，并且match[1]存在或者context不存在——把这个绕口的表述转换一下：当selector是HTML标记 或者 selector是id表达式但没有上下文。

        很明显，判断排除了一种情况：selector是id表达式，但有上下文。排除的原因应该很好理解，可以[看下面的分析](#analysis)。

        再细分一下：

        *   如果是match[1]存在（说明是HTML标记），用`jQuery.merge`把match[1]转换而来的dom元素（组）合并到this，然后返回this。**其实就是用selector字符串（是HTML标记）来创建dom元素并添加到this，然后返回此jQuery对象this。**

            不过，要注意如果match[1]是纯HTML标签（如`<div></div>`），并且context是纯js对象，即这种形式：`$(html, props)`，**这是把dom属性（property）添加到selector代表的dom节点。**

            比如：`$('<body>',{width:'100px'})`，那么返回：`[<body style=​"width:​ 100px;​">​</body>​]`，即创建一个新的dom元素body（与当前文档中的body没有关系）。

            当然，这个"100px"也可以是函数。比如 `context:{width:function(){return "100px"}}`，那么将执行 this.width(context.width())，即this.width("100px")。

        *   match[1]不存在（说明context不存在），这是selector是id表达式了。

            使用`document.getElementById`来获取该dom元素并赋给this[0]，设置this.context等属性后返回this。

            **<span id="analysis">这里就可以解释一下上面为什么要排除selector是id表达式时有上下文的情况，因为有上下文就不能简单的通过`document.getElementById`来获取元素，必须判断上下文是否存在，指定上下文下是否有该id元素。</span>**

    3.  下面2个else就是剩下的2种情况，但都是match不存在，所以合在一起分析。

        match不存在说明不是HTML标记或ID表达式，即selector是复杂的表达式。

        *   如果context不存在或者context是jQuery对象：

                return ( context || rootjQuery ).find( selector );

        *   否则

                return this.constructor( context ).find( selector );

        这<span id="selector1-init">两种情况</span>调用了Sizzle（`jQuery.find = Sizzle;`）来处理。当然，更具体的分析在选择器第三部分[选择器3-前半部分流程](/2014/01/19/jquery-source-code-selector3.html#selector3-sizzle)。

###结束

本篇是选择器的初步介绍，或者说接触到了选择器，其实都是一些简单的selector处理，处理复杂的selector的Sizzle只是露了个面。下一章开始介绍Sizzle。