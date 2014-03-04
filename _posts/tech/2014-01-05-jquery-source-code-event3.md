---
layout: default
title: 学习jQuery源码-事件3——委托设计
category: tech
tags: [jQuery, source code, event]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第17章，是jQuery事件模块的第3部分。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###本章概览

从上一章能得到几个信息：

*   事件信息都存储在数据缓存中；
*   对于没有特殊事件特有监听方法的普通事件都用addEventListener来添加事件；
*   有特殊监听方法的特殊事件，则用了另一种方式来添加事件。

####本章分析重点

通过addEventListener触发事件后，回调句柄如何处理？

具体来说就是，如何委派事件的，用到哪些机制？

####涉及方面与jQuery的处理方案

涉及到

*   事件句柄的读取与处理
*   事件对象的兼容
*   委托关系的处理

jQuery处理

*   jQuery.event.fix(event)：将原生的事件对象 event 修正为一个可以读写的 event 对象，并对该 event 的属性以及方法统一接口。
*   jQuery.Event(event，props)：构造函数创建可读写的 jQuery 事件对象 event，该对象既可以是原生事件对象 event 的增强版，也可以是用户自定义事件。
*   jQuery.event.handlers：用来区分原生与委托事件。

###事件执行顺序

HTML：

    <div id='p1' class='p1'>点击d
        <div id='p2' class='p2'>点击c
            <p id="p3" class='p3'>点击b
                <a id="p4" class='p4'>点击a</a>
            </p>
        </div>
    </div>

js：
    
    var p1 = $('#p1')
    p1.on('click',function(){
        alert('p1')
    })

    var p2 = $('#p2')
    p2.on('click',function(e){
        alert('p2')
    })
    p2.on('click','a,p',function(e){
        alert(e.currentTarget.nodeName)
    })

    var p3 = $('#p3')
    p3.on('click',function(){
        alert('p3')
    })

点击a后，结果按如下顺序依次执行：

    output：p3-->A-->P-->p2-->p1

点击p3后，结果按如下顺序依次执行：

    output：p3-->P-->p2-->p1


<br/>
可见：

**默认的触发循序是从事件源目标元素也就是event.target指定的元素，一直往上冒泡到document或者body，途经的元素上如果有对应的事件都会被依次触发。**

元素本事 **绑定** 与 **委派** 事件的处理顺序：

*（假设绑定事件的元素本身是A，委派给元素B与C）*

1.  元素A本身绑定某事件t，A还委派元素B.C事件t。委派的元素B.C肯定是该元素A内部的，所以先处理内部的委派，最后处理本身的事件。
2.  元素A本身绑定某事件t，A还有祖先元素P委派的同一事件t，则首先执行自身绑定，然后执行委派。

###停止事件传播

这一段说一下与执行顺序相关的停止事件传播。

怎么终止冒泡？

2种方式：

1.  preventDefault和stopPropagation：阻止默认行为和停止事件传播。
2.  return false：其实就是根据返回的布尔值调用preventDefault，stopPropagation方法。

###事件对象event的兼容

jQuery需要解决事件对象不同浏览器的兼容性问题。

event 对象是 JavaScript 中一个非常重要的对象，用来表示当前事件。event 对象的属性和方法包含了当前事件的状态。

当前事件，是指正在发生的事件；状态，是与事件有关的性质，如引发事件的DOM元素、鼠标的状态、按下的键等等。event 对象只在事件发生的过程中才有效。

####event在不同浏览器的实现差异：

*   在 W3C 规范中，event 对象是随事件处理函数传入的，Chrome、FireFox、Opera、Safari、IE9.0及其以上版本都支持这种方式；
*   但是对于 IE8.0 及其以下版本，event 对象必须作为 window 对象的一个属性。
*   event的某些属性只对特定的事件有意义。比如，fromElement 和 toElement 属性只对 onmouseover 和 onmouseout 事件有意义。

**特别指出：**分析的版本是2.0.3，已经不再兼容IE6/7/8了，所以部分兼容问题都已经统一了。例如：事件绑定的接口，事件对象的获取等等。

关于event更多可参见<http://www.itxueyuan.org/view/6340.html>。

<br/>

####jQuery在event上的兼容

jQuery把事件对象的兼容问题单独抽象出一个类，用来重写这个事件对象。

其中 jQuery.event.fix() 解决跨浏览器的兼容性问题，统一接口。除这个核心方法外，还有props、 fixHooks、keyHooks、mouseHooks 等钩子。

在fix中，通过`event = new jQuery.Event( originalEvent );`，jQuery获取了原生事件对象，应该说，event就是对原生事件对象的一个重写，增加了自己的处理机制。

现在先看jQuery.Event类：

#####jQuery.Event

    jQuery.Event = function( src, props ) {
        // Allow instantiation without the 'new' keyword
        // 惯例允许不用new来创建Event对象
        if ( !(this instanceof jQuery.Event) ) {
            return new jQuery.Event( src, props );
        }

        // Event object
        // src是Event对象
        if ( src && src.type ) {
            this.originalEvent = src;
            this.type = src.type;

            // Events bubbling up the document may have been marked as prevented
            // by a handler lower down the tree; reflect the correct value.
            // 获取冒泡是否已被阻止
            // 根据src，以返回true/false的函数赋值
            this.isDefaultPrevented = ( src.defaultPrevented ||
                src.getPreventDefault && src.getPreventDefault() ) ? returnTrue : returnFalse;

        // Event type
        // src是Event 类型
        } else {
            this.type = src;
        }

        // Put explicitly provided properties onto the event object
        // 复制props中所有属性
        if ( props ) {
            jQuery.extend( this, props );
        }

        // Create a timestamp if incoming event doesn't have one
        // 时间戳
        this.timeStamp = src && src.timeStamp || jQuery.now();

        // Mark it as fixed
        // 表示已修复
        this[ jQuery.expando ] = true;
    };

jQuery.Event类定义很简单，不多讲。下面看它的原型：

    jQuery.Event.prototype = {
        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,
        isImmediatePropagationStopped: returnFalse,
        //取消特定事件的默认行为
        preventDefault: function() {
            var e = this.originalEvent;

            this.isDefaultPrevented = returnTrue;//更改状态，阻止默认行为 true

            if ( e && e.preventDefault ) {
                e.preventDefault();//用原生API阻止默认行为发生
            }
        },
        stopPropagation: function() {
            var e = this.originalEvent;

            this.isPropagationStopped = returnTrue;//更改状态，停止冒泡 true

            if ( e && e.stopPropagation ) {
                e.stopPropagation();//停止冒泡
            }
        },
        stopImmediatePropagation: function() {
            this.isImmediatePropagationStopped = returnTrue;//更改状态，立即停止冒泡 true
            this.stopPropagation();// 调用stopPropagation
        }
    };

#####jQuery.event中的钩子

1.  fixHooks

        fixHooks: {},

    怎么说呢，fixHooks就是一个各种fixHook组成的集合，一个fixHook就是一个针对某个事件类型的完整兼容对象：

        fixHook:{
            eventType:{
                props:[],
                filter:function( event, original ) {}
            }
        }

    为什么用fixHooks来缓存fixHook集合？就是想提高效率（省去正则判断）。

2.  props

        // Includes some event props shared by KeyEvent and MouseEvent
        // 键盘事件和鼠标事件共享的event的属性
        props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

3.  keyHooks

    针对键盘事件，添加一些属性，修正一些属性。

        keyHooks: {
            // 添加键盘事件对象的属性（相比共享的props）
            props: "char charCode key keyCode".split(" "),
            filter: function( event, original ) {

                // Add which for key events
                // 键盘事件时添加event.which
                if ( event.which == null ) {
                    event.which = original.charCode != null ? original.charCode : original.keyCode;
                }

                return event;
            }
        },

4.  mouseHooks

    针对鼠标事件，添加一些属性，修正一些属性。
        
        mouseHooks: {
            // 添加鼠标事件对象的属性（相比共享的props）
            props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
            filter: function( event, original ) {
                var eventDoc, doc, body,
                    button = original.button;

                // Calculate pageX/Y if missing and clientX/Y available
                // 鼠标事件对象修正pageX/Y
                if ( event.pageX == null && original.clientX != null ) {
                    eventDoc = event.target.ownerDocument || document;
                    doc = eventDoc.documentElement;
                    body = eventDoc.body;

                    event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
                    event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
                }

                // Add which for click: 1 === left; 2 === middle; 3 === right
                // Note: button is not normalized, so don't use it
                // 鼠标事件对象添加event.which
                if ( !event.which && button !== undefined ) {
                    event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
                }

                return event;
            }
        },



#####jQuery.event.fix

整个fix函数就是为创建一个兼容的event对象。

    fix: function( event ) {
        // 已经修正过，直接返回event
        if ( event[ jQuery.expando ] ) {
            return event;
        }

        // Create a writable copy of the event object and normalize some properties
        var i, prop, copy,
            type = event.type,
            originalEvent = event,
            fixHook = this.fixHooks[ type ];

        if ( !fixHook ) {// 填充fixHook/this.fixHooks

            // rmouseEvent = /^(?:mouse|contextmenu)|click/,
            // type是mouse类事件的类型，就赋值this.mouseHooks
            this.fixHooks[ type ] = fixHook =
                rmouseEvent.test( type ) ? this.mouseHooks :
                // rkeyEvent = /^key/,
                // type是key事件的类型，则赋值this.keyHooks，否则还是空对象{}
                rkeyEvent.test( type ) ? this.keyHooks :
                {};
        }

        // 获取共享的属性props，和fixHook.props拼接到一起
        copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

        // 已原event对象为基础创建jQuery.Event对象
        event = new jQuery.Event( originalEvent );

        i = copy.length;
        while ( i-- ) {
            prop = copy[ i ];
            event[ prop ] = originalEvent[ prop ];// 把copy数组中的属性添加到event
        }

        // Support: Cordova 2.5 (WebKit) (#13255)
        // All events should have a target; Cordova deviceready doesn't
        // 修正event.target对象，针对Cordova 2.5没有target对象
        if ( !event.target ) {
            event.target = document;
        }

        // Support: Safari 6.0+, Chrome < 28
        // Target should not be a text node (#504, #13143)
        // 修正event.target对象，针对Safari 6.0+, Chrome < 28 的target对象是文本节点
        if ( event.target.nodeType === 3 ) {
            event.target = event.target.parentNode;
        }

        //调用fixHook.fitler方法纠正一些特定的event属性
        return fixHook.filter? fixHook.filter( event, originalEvent ) : event;
    },

**分析：**

1.  扩展事件属性

    jQuery.Event构造函数的参数中props必然是要先经过兼容处理的，因为jQuery.Event类并未处理props属性的兼容性。

        var fixHook = this.fixHooks[ type ];// fixHooks为空对象，所以fixHook此时为undefined

        if ( !fixHook ) {// 填充fixHook/this.fixHooks

            // rmouseEvent = /^(?:mouse|contextmenu)|click/,
            // type是mouse类事件的类型，就赋值this.mouseHooks
            this.fixHooks[ type ] = fixHook =
                rmouseEvent.test( type ) ? this.mouseHooks :
                // rkeyEvent = /^key/,
                // type是key事件的类型，则赋值this.keyHooks，否则还是空对象{}
                rkeyEvent.test( type ) ? this.keyHooks :
                {};
        }

2.  键盘事件和鼠标事件共享的event属性

        //props是字符串数组
        props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

        // 获取共享的属性props，和fixHook.props拼接
        copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

3.  以原生event对象为基础创建jQuery.Event对象，并添加copy属性组（完全兼容）中属性

        // 已原event对象为基础创建jQuery.Event对象
        event = new jQuery.Event( originalEvent );

        i = copy.length;
        while ( i-- ) {
            prop = copy[ i ];
            event[ prop ] = originalEvent[ prop ];// 把copy数组中的属性添加到event
        }

4.  针对target的两个修正

        if ( !event.target ) {
            event.target = document;
        }
        if ( event.target.nodeType === 3 ) {
            event.target = event.target.parentNode;
        }

5.  返回时，再修正一些特定的event属性

        return fixHook.filter? fixHook.filter( event, originalEvent ) : event;


总的来说，jQuery.event.fix将原生的事件对象 event 修正为一个新的可写 event 对象，并对该 event 的属性以及方法统一接口；它内部调用了 jQuery.Event(event) 构造函数。

<br/>

####jQuery event的数据缓存（部分jQuery.event.dispatch）

jQuery.cache 实现了注册事件处理程序的存储，详细可参见前面关于Data和Cache的那一章。

实际上绑定在 DOM元素上的事件处理程序只有一个，即 `jQuery.cache[elem[expando]].handle` 中存储的函数。

add函数中：

    if ( !(eventHandle = elemData.handle) ) {
        eventHandle = elemData.handle = function( e ) {
            return typeof jQuery !== core_strundefined && (!e || jQuery.event.triggered !== e.type) ?
                jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
                undefined;
        };
        eventHandle.elem = elem;
    }

这一段代码相当清晰了，`function( e ) {}` 存储在 `elemData.handle` 属性上，该函数调用了`dispatch`函数，而`dispatch`函数中就包含了怎么取得事件句柄（handlers）。

**那怎么取事件句柄？**

    handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],

取得的就是 this 对应的 elemData.events。

事件句柄取到了，是不是立刻执行？当然不是，*首先要去处理委托*。

<br/>

####区分事件类型，组成事件队列（jQuery.event.handlers）

这是事件的核心的处理，委托的重点：

*   如何把回调句柄定位到当前的委托元素上面,如果有多个元素上绑定事件回调要如何处理？
*   做这个操作之前，根据冒泡的原理，是不是应该把每一个节点层次的事件给规划出来，每个层次的依赖关系？

所以jQuery引入了`jQuery.event.handlers`用来区分普通事件与委托事件，形成一个有队列关系的组装事件处理包`{elem, handlerObjs}`的队列。

在 add 函数中，我们用delegateCount用来记录委托数，通过传入的selector判断。

1.  先判断下是否要处理委托，找到委托的句柄。
2.  （1）如果没有委托，直接绑定的事件；对照事件执行顺序 这一段，就是
        
        var p1 = $('#p1')
        p1.on('click',function(){
            alert('p1')
        })

    没有selector，delegateCount 是 0，即委托判断不成立。

        if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

    然后直接组装下，返回elem与对应的handlers方法

        if ( delegateCount < handlers.length ) {
            handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
        }

        return handlerQueue;

    （2）委托处理。取出绑定事件节点上的handlers，可以看出此时元素本身有事件，元素还要处理委托事件。jQuery规定事件执行顺序：
    依赖委托节点在DOM树的深度安排优先级，委托的DOM节点层次越深，其执行优先级越高。委托的事件处理程序相对于直接绑定的事件处理程序在队列的更前面。

        // 火狐浏览器右键或者中键点击时，会错误地冒泡到document的click事件，这里排除一下
        if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

            //从event.target开始向上遍历节点
            //cur !== this的判断表面遍历到this时停止冒泡。
            for ( ; cur !== this; cur = cur.parentNode || this ) {

                // Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
                // disabled的元素不能被点击
                if ( cur.disabled !== true || event.type !== "click" ) {
                    matches = [];
                    for ( i = 0; i < delegateCount; i++ ) {
                        handleObj = handlers[ i ];

                        // Don't conflict with Object.prototype properties (#13203)
                        // 防止与Object.prototype的属性冲突
                        sel = handleObj.selector + " ";

                        // matches[ sel ]用来确定在当前的上下文中是否能找到这个selector元素（sel）
                        if ( matches[ sel ] === undefined ) {
                            matches[ sel ] = handleObj.needsContext ?
                                jQuery( sel, this ).index( cur ) >= 0 :
                                jQuery.find( sel, this, null, [ cur ] ).length;
                        }
                        if ( matches[ sel ] ) {
                            // 如果能找到正确，是存在当然这个事件节点下面的元素，就是说这个节点是需要委托处理的
                            // 推入matches数组
                            matches.push( handleObj );
                        }
                    }
                    if ( matches.length ) {
                        // 有委托事件，推入handlerQueue
                        handlerQueue.push({ elem: cur, handlers: matches });
                    }
                }
            }
        }


到这里我们可以看出delegate绑定的事件和普通绑定的事件是如何分开处理的。对应一个元素，一个event.type的事件处理对象队列在缓存里只有一个。

给出jQuery.event.handlers总的源码分析：

    handlers: function( event, handlers ) {
        var i, matches, sel, handleObj,
            handlerQueue = [],
            delegateCount = handlers.delegateCount,
            cur = event.target;// 直接/最初触发事件的目标DOM元素；

        // Find delegate handlers
        // Black-hole SVG <use> instance trees (#13180)
        // Avoid non-left-click bubbling in Firefox (#3861)
        // 找到委托的事件处理函数
        // 火狐浏览器右键或者中键点击时，会错误地冒泡到document的click事件，这里排除一下
        if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

            //从event.target开始向上遍历节点
            //cur !== this的判断表面遍历到this时停止冒泡。
            for ( ; cur !== this; cur = cur.parentNode || this ) {

                // Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
                // disabled的元素不能被点击
                if ( cur.disabled !== true || event.type !== "click" ) {
                    matches = [];
                    for ( i = 0; i < delegateCount; i++ ) {
                        handleObj = handlers[ i ];

                        // Don't conflict with Object.prototype properties (#13203)
                        // 防止与Object.prototype的属性冲突
                        sel = handleObj.selector + " ";

                        // matches[ sel ]用来确定在当前的上下文中是否能找到这个selector元素（sel）
                        if ( matches[ sel ] === undefined ) {
                            matches[ sel ] = handleObj.needsContext ?
                                jQuery( sel, this ).index( cur ) >= 0 :
                                jQuery.find( sel, this, null, [ cur ] ).length;
                        }
                        if ( matches[ sel ] ) {
                            // 如果能找到正确，是存在当然这个事件节点下面的元素，就是说这个节点是需要委托处理的
                            // 推入matches数组
                            matches.push( handleObj );
                        }
                    }
                    if ( matches.length ) {
                        // 有委托事件，推入handlerQueue
                        handlerQueue.push({ elem: cur, handlers: matches });
                    }
                }
            }
        }

        // Add the remaining (directly-bound) handlers
        // 加入直接绑定的事件处理函数
        if ( delegateCount < handlers.length ) {
            handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
        }

        return handlerQueue;
    },

总结一下jQuery.event.handlers的功能：

有序地返回当前事件所需执行的所有事件处理程序。返回的结果是 [{elem: currentElem, handlers: handlerlist}, ...] 。

这里的事件处理程序既包括直接绑定在该元素上的事件处理程序，也包括利用冒泡机制委托在该元素的事件处理程序（委托机制依赖于 selector）。在返回这些事件处理程序时，委托的事件处理程序相对于直接绑定的事件处理程序在队列的更前面，委托层次越深，该事件处理程序则越靠前。

<br/>

####稍微总结一下事件执行流程

到这里，

1.  event兼容已分析；
2.  事件句柄缓存也分析了；
3.  委托与直接绑定的处理也分析了。

可以稍微回顾一下事件绑定的执行流程，当然这并不完整，在之后的几章也会加以完善。

事件绑定流程：

1.  bind等API最终调用`on( types, selector, data, fn, /*INTERNAL*/ one );`

    on调整参数，最终调用`jQuery.event.add( this, types, fn, data, selector )`
    
        // 声明一点，one直接执行
            
        jQuery().off( event );
        return origFn.apply( this, arguments );
        
        机制与一般on不同，现在先放下，到解析off时一并处理。

2.  jQuery.event.add

    jQuery.event.add缓存了事件对象（elemData对象，包括两个重要属性events、handle），另外就是通过
    
        elem.addEventListener( type, eventHandle, false );
    
    或者
        
        special.add.call( elem, handleObj );

    最终进行事件绑定。

**必须强烈声明：eventHandle就是一个调用`dispatch`的函数，所以最终绑定的其实就是一个函数（而非真正的处理函数队列）：jQuery.event.dispatch分发函数。**

    eventHandle = elemData.handle = function( e ) {
        return typeof jQuery !== core_strundefined && (!e || jQuery.event.triggered !== e.type) ?
            jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
            undefined;
    };
    // arguments其实就是 e ，可用jQuery.event.dispatch.call( eventHandle.elem, e)代替。

####jQuery.event.dispatch源码分析

dispatch就是事件分发器。

    dispatch: function( event ) {

        // Make a writable jQuery.Event from the native event object
        // 首先根据原生event创建一个可写的兼容的jQuery.Event
        event = jQuery.event.fix( event );

        var i, j, ret, matched, handleObj,
            handlerQueue = [],
            args = core_slice.call( arguments ),
            // 获取节点events缓存的type属性，这是一个对象组成的数组。
            handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],
            special = jQuery.event.special[ event.type ] || {};

        // Use the fix-ed jQuery.Event rather than the (read-only) native event
        // args[0]原本为原生event对象，现在替换成jQuery.Event对象
        args[0] = event;
        event.delegateTarget = this;

        // Call the preDispatch hook for the mapped type, and let it bail if desired
        if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
            return;
        }

        // Determine handlers
        // 调用handlers函数处理，获取handlerQueue
        handlerQueue = jQuery.event.handlers.call( this, event, handlers );

        // Run delegates first; they may want to stop propagation beneath us
        // 针对handlerQueue的筛选
        // handlerQueue事件的顺序本来就是委托在前，本身的事件在后面，所以不需改动
        i = 0;
        while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
            event.currentTarget = matched.elem;

            j = 0;
            // 处理 handler队列
            // 如果是isImmediatePropagationStopped()，则不执行本节点的处理函数队列
            while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

                // Triggered event must either 1) have no namespace, or
                // 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
                if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {
                    //产生的事件对象其实只有一份，通过jQuery.Event构造出来的event
                    // 遍历时修改一些属性
                    event.handleObj = handleObj;
                    event.data = handleObj.data;

                    //执行事件句柄
                    // while循环中所有的处理函数都执行了！！！
                    ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
                            .apply( matched.elem, args );

                    if ( ret !== undefined ) {
                        // 如果有返回值 比如return false 
                        if ( (event.result = ret) === false ) {
                            // 系统就调用preventDefault、stopPropagation 来停止冒泡
                            // 相对于isImmediatePropagationStopped()，本节点的处理函数还是执行的。
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }
                }
            }
        }

        // Call the postDispatch hook for the mapped type
        if ( special.postDispatch ) {
            special.postDispatch.call( this, event );
        }

        return event.result;
    },

源码的分析都在注释中。应该说仔细看看`dispatch`分发函数，事件的处理流程就清楚得多了。

dispatch到底做了什么？

1.  调用`jQuery.event.fix( event )`，获取修复的event；
2.  根据this（也就是当前的元素节点），从全局缓存获取事件数据缓存（清楚点说就是elemData.events[type]）。

        handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],

    给一张图可以清楚说明：

    ![elemData.events[type]](/images/jquery/elemData3.png "事件数据缓存")

3.  把上面获取的handlers作为参数，调用jQuery.event.handlers( event, handlers )获取处理函数队列handlerQueue。

        handlerQueue = jQuery.event.handlers.call( this, event, handlers );

4.  while循环，执行handlerQueue中的每个处理函数。

        //执行事件句柄
        ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
                .apply( matched.elem, args );


应该说`dispatch`是事件执行的核心了。这份流程也只是处理函数handler执行流程。

<br/>

###到目前为止的on执行流程分析

用之前的例子来解释：

    var p2 = $('#p2')
    p2.on('click',function(e){
        alert('p2')
    })
    p2.on('click','a,p',function(e){
       alert(e.currentTarget.nodeName)
    })

<br/>

它的事件数据缓存就是上面的图片所给出的。下面正式分析流程：

1.  绑定：p2节点共需要绑定2次，各处理各的流程，但写入同一数据缓存elemData。
2.  注意：虽然同一个节点上绑定多个事件，但jQuery在初始化绑定阶段就优化了，所以触发时只会执行一次回调指令。但具体怎么优化的呢？重点仍在 **jQuery.event.add** 函数。

        //两次绑定，但取的是同一个数据缓存
        elemData = data_priv.get( elem );
        // 取的是同一个events、eventHandle
        if ( !(events = elemData.events) ) {//第2次或以上，取得是同一个events
        if ( !(eventHandle = elemData.handle) ) {//第2次或以上，取得是同一个handle

    现在很好理解了，**触发事件时，不论绑定多少次，其实只调用eventHandle这一个函数，eventHandle是dispatch函数的包装，由dispatch来调用执行所有 处理函数。**
3.  触发节点的时候，先包装兼容事件对象，然后取出对应的elemData。
4.  获取handlerQueue队列，委托在前，本身在后。
5.  遍历handlerQueue队列，根据判断是否isPropagationStopped，isImmediatePropagationStopped来对应是否执行。
6.  如果reuturn false则默认调用 event.preventDefault(); event.stopPropagation();

###结束

本章分析了jQuery事件的绑定、分发、执行，算是事件模块的核心。

应该说代码的理解还是有难度的，特别注意要优先理解事件的流程，这样每个函数干了什么，为什么这么做就能做到心中有数。但问题是如果你不先去看每个函数的具体内容，又怎么知道流程？好吧，这是看代码看到心烦的一点小抱怨，毕竟对着200多行的一个函数或者十几二十多个变量挤在一起的函数还是忍不住心头起火。

在此，再次感谢Aaron的jQuery源码系列，虽然没写全，好多地方也不甚明晰（ 可能我水平不够 ;-) ），但至少是比较贴心的指导。顺便说一下，本篇文章再加上一篇涉及的代码请多看多读，如果想真正搞懂jQuery事件原理的。

下一章分析事件的触发或者说自定义事件。