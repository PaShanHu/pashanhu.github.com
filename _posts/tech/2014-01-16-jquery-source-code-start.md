---
layout: default
title: 学习jQuery源码-开篇
category: tech
tags: [jQuery, source code]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第1章，是整个jQuery源码学习系列的开端。</p><p>jQuery是最流行的javascript框架，在世界前10000个访问最多的网站中，有超过55%在使用jQuery。研究jQuery源码即是出于工作考虑，也是因为对这个框架何以如此流行的好奇。</p><p>当然，源码解读不是闭门造车，是站在巨人肩膀上的学习。我参考了网上的一些文章，结合自己的实际学习使用的感受，才有了这个系列的文章。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###jQuery是什么？

jQuery是一个兼容多浏览器的javascript框架，核心理念是write less,do more(写得更少,做得更多)。

jQuery在2006年1月由美国人John Resig在纽约的barcamp发布，吸引了来自世界各地的众多JavaScript高手加入，由Dave Methvin率领团队进行开发。

如今，jQuery已经成为最流行的javascript框架，在世界前10000个访问最多的网站中，有超过55%在使用jQuery。——摘自[百度百科](http://baike.baidu.com/link?url=4G117d90XiFhWIs62Arao6cbEJa_EzchtS7ZYu7_HqjI4ArNia8ozRVSbnlOxOF07bFr1MxOtcKvmeVwx6tg_K)

相信jQuery的大名大家都知道，就不累述了。

####jQuery的使用

    $('body > #text p:eq(0)').addClass('paragraph').hide();

只通过这一句代码，我们可以发现jQuery的几个特点：

*   强大的选择器
*   高效的链式调用
*   便捷的API

####$或者jQuery到底是什么？

![jquery](/images/jquery/jquery.png)

很简单，jQuery就是一个函数（对象），而$是它的别名。

###jQuery对象的构造

我们已经知道jQuery是个对象，但它怎么构造的？

####从普通js对象开始

js一开始是没有类（class）的概念的，但可以通过其它方法模拟类。我们一一个简单自定义类开始，来探讨jQuery的构造方法。

1.  从常规方法到无new构建

        var aQuery = function() {//构造函数
        }
        aQuery.prototype = {//原型
            age:function(){}
        }

        var a = new aQuery();

    这是最简单的类创建与实例化，如果没有new，实例化时this就不会指向返回的实例对象，如这里就指向window。

    这是灾难性的事，如果你在实例化时忘了new关键字，那么各种错误随之而来。

    怎么实现无new构造？很简单，在构造函数中返回实例。

        var aQuery = function() {
            return new aQuery();
        }
        aQuery.prototype = {
            age:function(){}
        }

    显然你用`var a = aQuery();`就可以获得aQuery的实例，但问题又来了，这明显是个死循环，怎么解决？

2.  如何解决死循环，正确返回实例？

    我们不想用new，又要this指向正确，那么是否可以找个变通的方法？看下面：

        var aQuery = function() {
           return  aQuery.prototype.init();
        }
        aQuery.prototype = {
            init:function(){
                return this;
            },
            age:function(){}
        }

    很明显，init中this就是aQuery，那么，这样既避免使用new，又防止了死循环。但这真的完美了吗？

    看下面几行代码：

        var aQuery = function() {
            return  new aQuery.prototype.init();
        }
        aQuery.prototype = {
            init: function() {
                this.age = 18;
                return this;
            },
            age: 20
        }

        aQuery().age  //输出18，感觉好像一切很完美
        aQuery().age  //还是输出18

    到这里应该清楚了，**我们没有使用new关键字来新建实例，那么所有的aQuery()都是指向同一个对象，或者说这里init中的this指向了aQuery类。**

    这样一来，作用域就混淆了，只有一个类，所有的操作都是对类做出的。

3.  添加new关键字，每次都创建新的实例来分隔作用域

    看下面几行代码：

        var aQuery = function() {
            return  new aQuery.prototype.init();
        }
        aQuery.prototype = {
            init: function() {
                this.age = 18;
                return this;
            },
            name: function() {},
            age: 20
        }

        aQuery().age  //输出18，一切很完美
        aQuery().name()  //TypeError: Object [object Object] has no method 'name'

    这里又出现一个问题，**一旦对init用了new，那么this不再指向aQuery，而是aQuery.init!**

    而init是理所当然没有name属性的。

4.  最终解决方案，以new分隔作用域但又可互相访问属性

        var aQuery = function() {
            return  new aQuery.prototype.init();
        }
        aQuery.prototype = {
            init: function() {
                return this;
            },
            name: function() {
                return this.age
            },
            age: 20
        }

        aQuery.prototype.init.prototype = aQuery.prototype;

        aQuery().name()  //输出20

    `aQuery.prototype.init.prototype = aQuery.prototype;`是重中之重。**通过原型传递解决问题，把aQuery的原型传递给`aQuery.prototype.init.prototype`。换句话说aQuery的原型对象覆盖了init构造器的原型对象。**

    **因为是引用传递，所以不需要担心这个循环引用的性能问题。**

####初步认识jQuery类

#####jQuery类定义

利用一个普通js对象aQuery解析了jQuery构造的最基本原理，我们可以真正进入源码，去看一看jQuery到底是不是这样来做的。

可以看到代码一开始就是一大堆变量定义，里面可以看到这一句：

    // 定义一份本地的jQuery
    jQuery = function( selector, context ) {
        return new jQuery.fn.init( selector, context, rootjQuery );
    },

再往下，可以看到：

    jQuery.fn = jQuery.prototype = {
        ...
        constructor: jQuery,
        init: function( selector, context, rootjQuery ) {}
        ...
    }

    jQuery.fn.init.prototype = jQuery.fn;

到这里，我们应该明白jQuery类的定义/构造就是我们在上面所给出的。

**重要的恒等式：**

*   `jQuery.fn = jQuery.prototype`，所以一切`jQuery.fn.api`就是添加到`jQuery.prototype`的，就是`$(selector)`构造的jQuery对象能使用的方法。
*   `jQuery.fn.init.prototype = jQuery.fn;`，使用了new ，所以this其实指向jQuery.fn.init对象，但因为这一句，所有`jQuery.fn.api`都能为jQuery对象所使用。

#####添加jQuery到window全局对象（暴露jQuery）

jQuery内部定义了jQuery对象，但怎么把它暴露出去的呢？

    (function( window, undefined ) {

        var
            // Map over jQuery in case of overwrite
            _jQuery = window.jQuery,

            // Map over the $ in case of overwrite
            _$ = window.$,

            jQuery = function( selector, context ) {
                return new jQuery.fn.init( selector, context, rootjQuery );
            },

            ...

        if ( typeof module === "object" && module && typeof module.exports === "object" ) {
            // Expose jQuery as module.exports, Node module 
            module.exports = jQuery;
        } else {
            // Register as a named AMD module
            if ( typeof define === "function" && define.amd ) {
                define( "jquery", [], function () { return jQuery; } );
            }
        }

        // If there is a window object, that at least has a document property,
        // define jQuery and $ identifiers
        if ( typeof window === "object" && typeof window.document === "object" ) {
            window.jQuery = window.$ = jQuery;
        }

    })( window );

jQuery本身是个闭包，接受一个window对象。在代码最后，把jQuery对象添加到window对象，完成暴露。

另外，jQuery同时支持Node模块和AMD规范。

**有趣的一点是**，`function( window, undefined )`有一个未给实参的undefined形参，那么undefined就是真正的undefined了。为什么这么做？因为在有些浏览器中，undefined是可以被赋予其他值的。

####强大的jQuery接口

*   jQuery( selector [, context ] )
    
    接受一个包含一个CSS选择器的字符串，用于匹配的一组元素。

    *   jQuery( selector [, context ] )
    *   jQuery( element )
    *   jQuery( elementArray )
    *   jQuery( object )
    *   jQuery( jQuery object )
    *   jQuery()

*   jQuery( html [, ownerDocument ] )
    
    根据提供的原始 HTML 标记字符串，动态创建由 jQuery 对象包装的 DOM 元素。

    *   jQuery( html [, ownerDocument ] )
    *   jQuery( html, attributes )

*   jQuery( callback )

    当DOM完成加载的时候绑定一个要执行的函数。

    *   jQuery( callback )

强大的接口必然需要复杂的处理逻辑，但具体处理方法放到下一章，现在不多分析。

###链式调用

jQuery的一个显著特性就是方便、快捷、高效的链式调用。

    box.find('p.info').text('This is a message.').end().find('p.result').text('ok');

链式调用原理很简单，就是通过对象上每个方法最后返回本对象---this。本章不多介绍了，后面有专门的一篇来介绍[链式调用与回溯](/2013/12/29/jquery-source-code-end.html)

###从插件机制来看jQuery结构

jQuery丰富强大的插件是其风靡的重要原因。jQuery的插件一般什么样的呢？

说穿了，**jQuery插件就是通过`jQuery.extend`方法向jQuery对象或者jQuery.fn对象添加API。**

而插件就是按向jQuery还是jQuery.fn添加方法分为两类：

*   一种是类级别的插件开发，即给jQuery添加新的全局函数，相当于给jQuery类本身添加方法。

*   另一种是对象级别的插件开发，即给jQuery对象添加方法。

当然，本章的重点不是讲jQuery插件怎么开发，而是从它引申，看看jQuery的结构。

####jQuery结构

其实jQuery本身就是一个个模块（插件）组合而成。

出去开始定义时就给出的属性（包括init、selector等）以及添加到jQuery类的extend方法，后面的API或者是各色功能基本是通过extend添加上去的。

大致浏览一遍源码，可以发现jQuery大致可以分为以下几部分：

1.  jQuery对象构造（init等）
2.  工具函数 Utilities
3.  css选择器 Sizzle
4.  异步队列 Deferred Callbacks
5.  浏览器测试 Support
6.  数据缓存 Data
7.  队列 queue
8.  属性操作 Attribute
9.  事件 Event
10. CSS操作
11. 异步请求 Ajax
12. 动画 FX
13. 坐标和大小

jQuery的源码结构其实相当清晰、条理，不像代码那般因为大量的兼容处理而晦涩难懂。


###结束

本篇是jQuery源码分析开篇，初步介绍了jQuery。下一章将分析jQuery的选择器。