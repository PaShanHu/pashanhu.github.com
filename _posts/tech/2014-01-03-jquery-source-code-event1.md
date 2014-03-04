---
layout: default
title: 学习jQuery源码-事件1——API与事件体系
category: tech
tags: [jQuery, source code, event]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第15章，是jQuery事件模块的第1部分。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###事件简介 

事件(Event)是JS应用交互的核心，你可以监听事件，对这些事件做出响应等等。

jQuery对事件绑定有以下几个API：

*   .bind()：对元素的样式操作,底层的实现就是修改元素的className值。
*   .live() 为匹配的元素集合中的每个元素中移除一个属性（attribute）。
*   .delegate()为集合中匹配的元素删除一个属性（property）。
*   .on()获取匹配的元素集合。

但不管是用什么方式绑定,归根到底还是用浏览器API——addEventListener/attachEvent处理的,正如选择器一样不管如何匹配，最终还是那么几个浏览器接口处理。

既然如此,事件为什么还要区分那么多不同的处理方案?

这里就要涉及到*DOM事件处理模型*了,就是常提到的**捕获**与**冒泡**。

####传统事件处理：

给某一元素绑定一个点击事件，传入一个回调函数处理：

    element.addEventListener('click',doSomething,false);

正常情况下，js就是这样添加事件处理的。但是，假设页面上有几个百元素需要绑定,那么就要绑定几百次。

这样问题就出现了：

1.  大量的事件绑定，性能消耗，而且还需要解绑（IE会泄漏）；
2.  绑定的元素必须要存在；
3.  后期生成HTML会没有事件绑定，需要重新绑定。

有没有办法优化呢? 答案是肯定的。

####事件委托

DOM2.0模型将事件处理流程分为三个阶段：

1.  事件捕获阶段，事件从 Document 对象沿着文档树向下传递给目标节点。如果目标的任何一个先辈专门注册了捕获事件句柄，那么在事件传播过程中运行这些句柄。
2.  事件目标阶段，直接注册在目标上的适合的事件句柄将运行。这与 0 级事件模型提供的事件处理方法相似。
3.  事件起泡阶段。在此阶段，事件将从目标元素向上传播回或起泡回 Document 对象的文档层次。

利用事件传播（这里是冒泡）这个机制，就可以实现事件委托。

**具体来说，事件委托就是事件目标自身不处理事件，而是把处理任务委托给其父元素或者祖先元素，甚至根元素（document）。**

####jQuery的事件优化

jQuery很好地利用了这个特性，所以就衍生出  .bind()、.live() .on()和.delegate()。

以"click"事件为例，绑定此事件可以：

*   click方法
*   bind方法
*   delegate方法
*   on方法

但不管你用的是（click / bind / delegate)之中那个方法，最终都是jQuery底层都是调用on方法来完成最终的事件绑定。

#####bind

    .bind( eventType [, eventData ], handler(eventObject) )

描述: 为一个元素绑定一个事件处理程序。

对于早期版本，.bind()方法用于直接附加一个事件处理程序到元素上。处理程序附加到jQuery对象中当前选中的元素，所以，在.bind()绑定事件的时候，这些**元素必须已经存在**。从jQuery 1.7开始，.on() 方法是将事件处理程序绑定到文档（document）的首选方法。

#####live

jQuery1.7开始，.live() 方法已经过时，jQuery2.0.3不存在该API，略去。

#####delegate

    .delegate( selector, eventType, handler(eventObject) )

描述: 为所有匹配选择器（selector参数）的元素绑定一个或多个事件处理函数，基于一个指定的根元素的子集，匹配的元素包括那些目前已经匹配到的元素，也包括那些今后可能匹配到的元素。

从jQuery 1.7开始，.delegate()已经被.on()方法取代。但是，对于早期版本，它仍然是使用事件代理（委派）最有效的方式。

#####on

    .on( events [, selector ] [, data ], handler(eventObject) )

描述: 在选定的元素上绑定一个或多个事件处理函数。

.bind(), .live(), .delegate()都是通过.on()来实现的，jQuery1.7开始，on也是被推荐的事件绑定首选方式。

###jQuery的事件体系

####jQuery事件处理机制的好处

*   兼容性：毋庸置疑，最明显的好处是解决了事件处理的兼容性问题，不需要自己去判断用addEventListener还是attachEvent。
*   便捷与高效：（1）常用事件的快捷方法；（2）可以在一个事件类型上添加多个事件处理函数，可以一次添加多个事件类型的事件处理函数。
*   扩展：支持自定义事件、组合事件。
*	提供了统一的事件封装、绑定、执行、销毁机制。

####jQuery事件API结构

因为live已被删除，剩下API的结构如下：

	------------------------             -----------------------------
	| bind/unbind          |-------------|      on/off               |
	|     click             | 由on/off实现 |        one                |
	| delegate/undelegate  |-------------|	trigger/triggerHandler   |
	------------------------             -----------------------------

jQuery事件绑定最后都是由on来实现：

#####click等快捷绑定

	// 25种事件统一增加到jQuery.fn上，内部调用this.on / this.trigger
	jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
		"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
		"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

		// Handle event binding
		jQuery.fn[ name ] = function( data, fn ) {
			return arguments.length > 0 ?
				this.on( name, null, data, fn ) :
				this.trigger( name );
		};
	});

#####bind/unbind

	//调用this.on/this.off
	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

#####delegate/undelegate
	
	//调用this.on/this.off
	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}

#####one

	//调用this.on
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},

---

**可见以上的接口只是修改了不同的传递参数，最后事件绑定都交给on实现，而解绑都交给了off。**

####jQuery事件流程

	//事件绑定  elem.on('click','div p',function(){});

	1.	jQuery.fn.on
	2.	jQuery.event.add    //给选中元素注册事件处理函数
	3.	jQuery.event.dispatch   //分派（执行）事件处理函数
	4.	jQuery.event.fix    //fix修正Event对象
	5.	jQuery.event.handlers    //组装事件处理器队列
	6.	执行事件处理函数

####jQuery为事件的支持做出的额外优化

#####兼容性问题处理

浏览器的事件兼容性是一个令人头疼的问题。jQuery提供了一个 event的兼容类方案。jQuery.event.fix 对游览器的差异性进行包装处理。

如：

1.	事件对象的获取兼容，IE的event在是在全局的window，标准的是event是事件源参数传入到回调函数中。
2.	目标对象的获取兼容，IE中采用srcElement，标准是target。
3.	relatedTarget只是对于mouseout、mouseover有用。在IE中分成了to和from两个Target变量，在mozilla中 没有分开。为了保证兼容，采用relatedTarget统一起来。
4.	event的坐标位置兼容。
5.	...

#####事件的存储优化

jQuery并没有将事件处理函数直接绑定到DOM元素上，而是通过`.data`存储在缓存`.cahce`上，这里就是之前分析的贯穿整个体系的缓存系统了。

*	声明绑定的时候：

	首先为DOM元素分配一个唯一ID，绑定的事件存储在`.cahce[唯一ID][.expand ][ 'events' ]`上，而events是个 键-值 映射对象，键就是事件类型，对应的值就是由事件处理函数组成的数组，最后在DOM元素上绑定（addEventListener/ attachEvent）一个事件处理函数eventHandle，这个过程由 `jQuery.event.add` 实现。

*	执行绑定的时候：

	当事件触发时eventHandle被执行，eventHandle再去$.cache中寻找曾经绑定的事件处理函数并执行，这个过程由 `jQuery.event.trigger` 和 `jQuery.event.handle`实现。

*	事件的销毁:

	事件的销毁则由jQuery.event.remove 实现，remove对缓存$.cahce中存储的事件数组进行销毁，当缓存中的事件全部销毁时，调用`removeEventListener/ detachEvent`销毁绑定在DOM元素上的事件处理函数eventHandle。


#####事件处理器

jQuery.event.handlers

针对事件委托和原生事件（例如"click"）绑定 区分对待

事件委托从队列头部推入，而普通事件绑定从尾部推入，通过记录delegateCount来划分，委托(delegate)绑定和普通绑定。

###结束

这篇只是对jQuery事件的初步介绍。下一篇开始深入on内部实现的分析。