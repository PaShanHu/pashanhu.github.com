---
layout: default
title: 学习jQuery源码-链式调用与回溯
category: tech
tags: [jQuery, source code]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第10章，主要分析jQuery的链式调用与回溯，重点分析其实现原理。</p>
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###链式调用--回溯

jQuery高效的原因之一就是其链式调用。链式调用原理很简单，就是通过对象上每个方法最后返回本对象---this。因为返回的是同一对象，所以链式操作就能持续下去。

####链式调用的好处

网上一般的解释是：

*	节省代码量，代码看起来更优雅；
*	返回的都是同一个对象，可以提高代码的效率。
*	另外还有一种就是让代码流程更清晰。
	
	因为Javascript是无阻塞语言，通过事件来驱动，异步来完成一些本需要阻塞进程的操作。异步编程，编写代码时也是分离的，这就使代码可读性变差。而链式操作，代码流程清晰，改善了异步体验。

####回溯

既然链式调用这么好，那回溯是干嘛的呢？有时你需要中间值而中断链式调用，或者链式调用中某个方法返回的this改变了，那么者就需要回溯了。回溯帮你维持this的正确指向

在jQuery中，回溯通过`pushStack()`和`end()`来实现。

	var box=$('#box');
	box.find('p.info').text('This is a message.')...//find函数改变了this，this从box变为p.info；
	//如果你希望继续对box进行操作，那么就要用到回溯。

	box.find('p.info').text('This is a message.').end().find('p.result').text('ok');
	//end()能返回之前的对象，即这里的box，也即回溯。


####回溯的源码分析

#####jQuery对象栈

jQuery内部维护着一个jQuery对象栈。每个遍历方法都会找到一组新元素（一个jQuery对象），然后jQuery会把这组元素推入到栈中。

每个jQuery对象一般有三个属性：context、selector和prevObject，其中的prevObject属性就指向这个对象栈中的前一个对象，而通过这个属性可以回溯到最初的DOM元素集。


#####end

end方法就是回溯到上一个dom合集。

	end: function() {
        return this.prevObject || this.constructor(null);
    },

分析：

非常简单明了，end就是返回prevObject对象。那么prevObject怎么产生的？

#####pushStack

在构建jQuery对象的时候，pushStack方法会创建prevObject。

先简单描述一下jQuery对象构建流程。

jQuery.fn.init()是$('selector')实际调用的函数，也就是由init实际构建jQuery对象。

由init入口进入，对selector进行分析：
1.	如果selector为空（null、undefined、' '），实际直接返回this，除了原型上的方法，实际这个对象没有context、selector、prevObject属性。
2.	selector是dom元素，设置`this.context = this[0] = selector;`；实际上也没有prevObject属性。
3.	...
4.	真正构建jQuery对象时就设置prevObject属性的情况：selector是字符串，且不是HTML标签，不是id号，此时进入jQuery.fn.find函数。

	( context || rootjQuery ).find( selector );
	或者
	this.constructor( context ).find( selector );

	然后转入find：
	
	jQuery.fn.extend({
        find: function( selector ) {
            ...
            ...

            //通过sizzle选择器，返回结果集
            jQuery.find( selector, self[ i ], ret );

            // Needed because $( selector, context ) becomes $( context ).find( selector )
            ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
            ret.selector = this.selector ? this.selector + " " + selector : selector;
            return ret;
        }

可以看到，在find中，真正调用了设置prevObject属性的pushStack函数。下面分析pushStack函数：

	// 将DOM元素集合压入jQuery栈。
	pushStack: function( elems ) {
	    // Build a new jQuery matched element set
	    // this.constructor()：相当于$('')；elems是dom元素数组；
        var ret = jQuery.merge( this.constructor(), elems );

        // Add the old object onto the stack (as a reference)
        ret.prevObject = this; // ret.prevObject设置为当前jQuery对象的引用
        // 这就是为什么通过prevObject能取到上一个合集的引用

        ret.context = this.context;

        // Return the newly-formed element set
        return ret;
    }

分析：

可以看出，一般不设context时，构造的jQuery对象的prevObject初始值就是rootjQuery（$(document)）。

如果是find、eq等各种过滤函数时，比如:
	
	var divs=$('div');
	//divs：[div#text, div.Aaron, div.tags, prevObject: jQuery.fn.jQuery.init[1], context: document, jquery: "2.0.3", constructor: function...]

	var d=divs.eq(0);//此时的this就是指向上面的jQuery对象。因为prevObject = this，所以就正确的指定了前一jQuery对象。


###结束

总体来说，jQuery的链式调用与回溯比较简单，但用的好对性能优化是很有益处的。下一篇分析属性操作。