---
layout: default
title: 学习jQuery源码-事件5——模拟事件
category: tech
tags: [jQuery, source code, event]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第19章，是jQuery事件模块的第5部分。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

<br/>

###焦点事件（focus/blur）

相信仔细看前一章的人跟我一样，对`trigger`方法中 `focus/blur` 的 *“卓尔不群”* 非常不解，至少在今天之前我还是不明白焦点事件为什么 *与众不同* 。

####blur与focus事件

*   blur :在这个事件触发前，*元素已经失去焦点*，**不冒泡**，同步触发。target 指向当前失去焦点的元素。
*   focus:在这个事件触发前，*元素已经得到焦点*，**不冒泡**，同步触发。target 指向当前得到焦点的元素。

---

与此同时 [DOM Level 3 事件模块](http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent) 还定义了 focusin ,focusout 以及 DOMFocusIn ，DOMFocusOut 四个事件。

*   focusin :在当前元素获得焦点前以及相关元素失去焦点前触发，**可冒泡**，同步触发。target 指向当前将要获得焦点的元素，relatedTarget 指向失去焦点的元素。
*   focusout :在当前元素失去焦点前触发，**可冒泡**，同步触发。target 指向当前将要失去焦点的元素，relatedTarget 指向将要失去焦点的元素。
*   DOMFocusIn :在这个事件触发前，*元素已经得到焦点*，**可冒泡**，同步触发。target 指向当前得到焦点的元素。
*   DOMFocusOut :在这个事件触发前，*元素已经没有焦点*，**可冒泡**，同步触发。target 指向当前失去焦点的元素。

---

根据DOM Level 3 事件模块，这些事件的**发生顺序**如下（这种顺序是假设一开始没有元素获得焦点）：

*   当前没有元素获得焦点，此时用户转移焦点到A：

    focusin：在A获得焦点前发送。

    focus：在A获得焦点后发送。

*   用户把焦点从A转移到B：

    focusout：在A失去焦点前发送。

    focusin：在B获得焦点前发送。

    blur：在A失去焦点后发送。

    focus：在B获得焦点后发送。

<br/>

###jQuery.event.special对象

这个方法在`event.add`，`event.dispatch`等几个事件的处理地方都会被调用到，`jQuert.event.special` 对象用于某些事件类型的特殊行为和属性。

换句话说就是某些事件不是大众化的的事件，不能一概处理，比如 load 事件拥有特殊的 noBubble 属性，可以防止该事件的冒泡而引发一些错误。

所以需要单独针对处理，但是如果都写成判断的形式，显然代码结构就不合理了，而且不方便提供给用户自定义扩展。

用一张图看看jQuery.event.special对象：

![jQuery.event.special对象](/images/jquery/special.png "jQuery.event.special对象")

**总共针对9种事件，不同情况下处理hack,我们具体分析下焦点事件兼容冒泡处理,其它处理应该大同小异。**

####jQuery.event.special之focusin/focusout

special针对focusin/focusout事件有特殊处理:

	// Create "bubbling" focus and blur events
	// Support: Firefox, Chrome, Safari
	if ( !jQuery.support.focusinBubbles ) {
	    jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {
            // orig是key；fix是value；即orig是原来的，fix是修复的。

            // Attach a single capturing handler while someone wants focusin/focusout
            var attaches = 0,
                handler = function( event ) {
                    jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
                };

            // fix是修复的focusin/focusout；orig是focus/blur
            jQuery.event.special[ fix ] = {
                setup: function() {
                    if ( attaches++ === 0 ) {//绑定
                        document.addEventListener( orig, handler, true );
                    }
                },
                teardown: function() {//解绑
                    if ( --attaches === 0 ) {
                        document.removeEventListener( orig, handler, true );
                    }
                }
            };
        });
    }

此时可以回忆一下在`jQuery.event.add`中的：

	special = jQuery.event.special[ type ] || {};
	type = ( selector ? special.delegateType : special.bindType ) || type;
	special = jQuery.event.special[ type ] || {};

	if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
	    if ( elem.addEventListener ) {
            elem.addEventListener( type, eventHandle, false );
        }
	}

之前一直迷迷糊糊的什么特殊方法绑定，现在总算明了了。

像foucusin/focusout等特殊事件，最终是用hack来处理的，即通过setup来绑定的。

**要注意的几点：**

1.	绑定的是focusin/ focusout 事件，但内部换成了focus/blur事件。
2.	document.addEventListener( orig, handler, true );事件绑在document上，最后一个参数是true，即捕获绑定。
3.	handler中调用了jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );方法。

#####为什么用捕获？为什么是focus/blur代替？

因为火狐不支持focusin/focusout事件，所以要找个所有浏览器都兼容的类似事件，那就只能是focus/blur。

但是focus/blur不能冒泡，怎么办?只能用捕获来模拟。但具体怎么模拟呢？见jQuery.event.simulate方法。

####jQuery.event.simulate方法

	simulate: function( type, elem, event, bubble ) {
	    // Piggyback on a donor event to simulate a different one.
        // Fake originalEvent to avoid donor's stopPropagation, but if the
        // simulated event prevents default then we do the same on the donor.
        // 修复事件，添加一些属性
        var e = jQuery.extend(
            new jQuery.Event(),
            event,
            {
                type: type,
                isSimulated: true,//标志已模拟
                originalEvent: {}
            }
        );
        // 如果要冒泡
        if ( bubble ) {
            // 利用jQuery.event.trigger模拟触发事件
            jQuery.event.trigger( e, null, elem );
        } else {
            // 否则利用jQuery.event.dispatch来执行处理
            jQuery.event.dispatch.call( elem, e );
        }
        // 如果需要阻止默认操作，则阻止
        if ( e.isDefaultPrevented() ) {
            event.preventDefault();
        }
	}

源码很短，也简单，除了修复事件对象，只是简单判断一下，调用其它函数而已。

结合focusin/ focusout，可知其冒泡原理是：

1.	focusin 事件添加事件处理程序时，jQuery 会在 document 上会添加 handler 函数；
2.	在事件捕获阶段监视特定元素的 focus/ blur 动作，捕获行为发生在 document 对象上，这样才能有效地实现所有元素都能可以冒泡的事件；
3.	程序监视到存在 focus/ blur 行为，就会触发绑定在 document 元素上的事件处理程序，该事件处理程序在内部调用 simulate 逻辑触发事件冒泡，以实现我们希望的可以冒泡事件。
4.	之后利用jQuery.event.trigger模拟触发事件，具体可看上一章的分析。

<br/>

###结束

这篇是简单地讲了讲特殊事件的处理和事件模拟。这篇写完，事件的所有内容基本都涉及了，但其中肯定有遗漏或者一笔带过的，原因可能是有些地方我自己也不太懂，或者纯粹是觉得太简单。

下一篇总结jQuery的事件模块。