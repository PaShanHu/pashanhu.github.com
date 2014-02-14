---
layout: default
title: 学习jQuery源码-选择器5——编译函数
postDate: 2014-01-20
tags: [jQuery, source code, selector]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###前言

上一章的select函数剩下一个compile函数没讲，一来是这个函数比较复杂，调用了多个其它函数，分析的话篇幅较大；二来也是这个函数太重要。总之，另起一篇比较适合。

我们知道，到上一章为止，已经有了词法分析集合groups（token序列组成的数组），以及seed种子集和整理后的选择器；但下一阶段究竟怎么处理，其实是没提及的，笼统地说交给compile函数。

那么这一章，就是讲讲接下来的匹配流程。

###Sizzle中的元匹配器

我们已经知道token对象了，形如

    {matches: ["div"],type: "TAG",value: "div"} 或 {type: ">",value: " > "}

经过tokenize解析选择器后，得到了token序列，这些token对象究竟怎么使用的？

<br/>

我们已经有一种用途了，即通过 Expr.find （ID、CLASS、TAG三种type） 来匹配，获取seed。但这只是简单的获取seed，找到ID、CLASS、TAG三种类型之一，调用Expr.find（原生API的包装）获取匹配的dom元素集。

但不是获取seed时，token对象怎么用？怎么匹配对应的dom元素？

这就需要说道Sizzle中的**元匹配器**——**Expr.filter**。这也是获取seed之后的处理流程的开端。

![Expr.filter](/images/jquery/expr.filter.png)

<br/>

其实在看完具体代码后，对Expr.filter具体功能是很清楚的：

filter，就是过滤。

**对谁过滤？seed种子集**。

怎么过滤？剩余选择器（用的时候是剩余token对象）有 `ATTR | CHILD | CLASS | ID | PSEUDO | TAG` 6种类型，每种都对应一种过滤方法，存储在`Expr.filter`对象上。

过滤函数是什么意思？根据传进来的selector，返回一个函数fun（有参数elem，判断elem的tag、id等等是否与selector相等）。fun就是闭包，**缓存了分解开的selector（就是token.matches[0]）**。

整个解析匹配过程就是对seed种子集内dom元素不断筛选。

<br/>

####Expr.filter.TAG

    "TAG": function( nodeNameSelector ) {
        //nodeNameSelector为*时返回函数（该函数返回值是true）；
        //否则返回一个函数：该函数参数为 dom元素，元素的nodeName与nodeNameSelector相同时返回true，否则false。
        var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();

        return nodeNameSelector === "*" ?
            function() { return true; } :
            function( elem ) {
                return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
            };
    },

TAG函数几乎是一目了然，就是**返回一个函数**，这个函数比较传进来的elem参数是否在 **标签名** 上与选择器一致。

####Expr.filter.CLASS

    "CLASS": function( className ) {
        //根据className返回函数；该函数接受参数 dom元素，dom元素的类名===className时true
        var pattern = classCache[ className + " " ];

        return pattern ||
            (pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
            classCache( className, function( elem ) {
                return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "" );
            });
    },

    classCache = createCache()

CLASS函数接受参数className，首先看看类名缓存里面有没有className，

###结束

本篇着重讲token序列的处理。下一章将重点分析compile函数及其它重要函数。