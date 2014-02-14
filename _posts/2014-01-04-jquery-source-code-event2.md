---
layout: default
title: 学习jQuery源码-事件2——绑定设计
postDate: 2014-01-04
tags: [jQuery, source code, event]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###事件绑定-on

说起jQuery的事件，不得不提一下Dean Edwards大神addEvent库，很多流行的类库的基本思想从他那儿借来的。jQuery的事件处理机制吸取了JavaScript专家Dean Edwards编写的事件处理函数的精华，使得jQuery处理事件绑定的时候相当的可靠。

在预留退路(graceful degradation)，循序渐进以及非入侵式编程思想方面，jQuery也做的非常不错。

####on API回顾

#####.on( events \[, selector \] \[, data \], handler(eventObject) )

events：一个或多个空格分隔的事件类型和可选的命名空间，或仅仅是命名空间，比如"click", "keydown.myPlugin", 或者 ".myPlugin"。

selector : 一个选择器字符串，用于过滤出被选中的元素中能触发事件的后代元素。如果选择器是 null 或者忽略了该选择器，那么被选中的元素总是能触发事件。

data :当一个事件被触发时，要传递给事件处理函数的event.data

handler:事件被触发时，执行的函数。若该函数只是要执行return false的话，那么该参数位置可以直接简写成 false。

####on源码

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
	    var origFn, type;

        // Types can be a map of types/handlers
        /*
         *types是对象时，即type--fn键值对，则分解后递归调用on
         *types：{
            'click':function(){},
            'focus':function(){},
            ...
         *}
        */
        if ( typeof types === "object" ) {
            // ( types-Object, selector, data )
            if ( typeof selector !== "string" ) {
                // ( types-Object, data )
                data = data || selector;
                selector = undefined;
            }
            for ( type in types ) {
                this.on( type, selector, data, types[ type ], one );
            }
            return this;
        }
        //根据参数情况进行处理
        if ( data == null && fn == null ) {
            // ( types, fn )
            fn = selector;
            data = selector = undefined;
        } else if ( fn == null ) {
            if ( typeof selector === "string" ) {
                // ( types, selector, fn )
                fn = data;
                data = undefined;
            } else {
                // ( types, data, fn )
                fn = data;
                data = selector;
                selector = undefined;
            }
        }
        if ( fn === false ) {
            //处理函数参数fn是false，则置为返回false的函数
            /*
             *returnFalse：
                function returnFalse() {
                    return false;
                }
            */
            fn = returnFalse;
        } else if ( !fn ) {
            //处理函数fn不存在，直接退出
            return this;
        }

        // 处理one（仅触发一次）
        if ( one === 1 ) {
            origFn = fn;
            fn = function( event ) {
                // Can use an empty set, since event contains the info
                // 首先解绑事件，然后调用处理函数
                jQuery().off( event );
                return origFn.apply( this, arguments );
            };
            // Use same guid so caller can remove using origFn
            fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
        }
        //正常情况下调用jQuery.event.add
        return this.each( function() {
            jQuery.event.add( this, types, fn, data, selector );
        });
	},

on函数还是很简单的，除了对one特殊处理外，最终都是交给jQuery.event.add来实现。

###解析事件预绑定

针对事件处理,我们可以拆分2部分：*事件预绑定期*+*事件执行期*

本章着重讲解事件预绑定的时候做了哪些处理，为什么要这样处理？

####jQuery.event.add源码分析

	add: function( elem, types, handler, data, selector ) {

	    var handleObjIn, eventHandle, tmp,
            events, t, handleObj,
            special, handlers, type, namespaces, origType,
            elemData = data_priv.get( elem );//获取数据缓存

        // Don't attach events to noData or text/comment nodes (but allow plain objects)
        if ( !elemData ) {
            return;
        }

        // Caller can pass in an object of custom data in lieu of the handler
        // 参数handler赋值给handleObjIn
        if ( handler.handler ) {
            handleObjIn = handler;
            handler = handleObjIn.handler;
            selector = handleObjIn.selector;
        }

        // Make sure that the handler has a unique ID, used to find/remove it later
        // 保证handler有个唯一id，以便之后查找与删除
        if ( !handler.guid ) {
            handler.guid = jQuery.guid++;// 没有编号则添加编号
        }

        // Init the element's event structure and main handler, if this is the first
        // 如果是第一次，则初始化元素的 事件结构 和 主handler
        if ( !(events = elemData.events) ) {
            events = elemData.events = {};
        }
        if ( !(eventHandle = elemData.handle) ) {
            eventHandle = elemData.handle = function( e ) {
                // Discard the second event of a jQuery.event.trigger() and
                // when an event is called after a page has unloaded
                // 函数时这样的：
                // 页面未加载好时的事件调用，
                // 丢弃jQuery.event.trigger()的第二个事件
                // 满足两者之一则返回undefined
                // 否则交给dispatch处理
                return typeof jQuery !== core_strundefined && (!e || jQuery.event.triggered !== e.type) ?
                    jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
                    undefined;
            };
            // Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
            // 为主handler添加一个elem属性
            eventHandle.elem = elem;
        }

        // Handle multiple events separated by a space
        // 事件可能是通过空格键分隔的字符串，所以将其变成字符串数组
        // core_rnotwhite:/\S+/g
        types = ( types || "" ).match( core_rnotwhite ) || [""];
        t = types.length;// 事件的个数
        while ( t-- ) {
            // 尝试取出事件的命名空间
            // 如"mouseover.a.b" → ["mouseover.a.b", "mouseover", "a.b"]
            tmp = rtypenamespace.exec( types[t] ) || [];
            // 取出事件类型，如mouseover
            type = origType = tmp[1];
            // 取出事件命名空间，如a.b，并根据"."分隔成数组
            namespaces = ( tmp[2] || "" ).split( "." ).sort();

            // There *must* be a type, no attaching namespace-only handlers
            if ( !type ) {
                continue;
            }

            // If event changes its type, use the special event handlers for the changed type
            // 事件是否会改变当前状态，如果会则使用特殊事件
            special = jQuery.event.special[ type ] || {};

            // If selector defined, determine special event api type, otherwise given type
            // 根据是否已定义selector，决定使用哪个特殊事件api，如果没有非特殊事件，则用type
            type = ( selector ? special.delegateType : special.bindType ) || type;

            // Update special based on newly reset type
            // type状态发生改变，重新定义特殊事件
            special = jQuery.event.special[ type ] || {};

            // handleObj is passed to all event handlers
            // handleObj叫做事件处理对象,传给所有事件处理函数
            handleObj = jQuery.extend({
                type: type,
                origType: origType,
                data: data,
                handler: handler,
                guid: handler.guid,
                selector: selector,
                needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
                namespace: namespaces.join(".")
            }, handleObjIn );

            // Init the event handler queue if we're the first
            // 初始化事件处理列队，如果是第一次使用，将执行语句
            if ( !(handlers = events[ type ]) ) {
                handlers = events[ type ] = [];
                handlers.delegateCount = 0;

                // Only use addEventListener if the special events handler returns false
                // 如果获取特殊事件的监听方法失败，则使用addEventListener
                if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
                    if ( elem.addEventListener ) {
                        elem.addEventListener( type, eventHandle, false );
                    }
                }
            }

            // 特殊事件使用add处理
            if ( special.add ) {
                special.add.call( elem, handleObj );
                // 设置事件处理函数的ID
                if ( !handleObj.handler.guid ) {
                    handleObj.handler.guid = handler.guid;
                }
            }

            // Add to the element's handler list, delegates in front
            // 将事件处理对象推入处理列表，姑且定义为事件处理对象包
            if ( selector ) {
                handlers.splice( handlers.delegateCount++, 0, handleObj );
            } else {
                handlers.push( handleObj );
            }

            // Keep track of which events have ever been used, for event optimization
            // 表示事件曾经使用过，用于事件优化
            jQuery.event.global[ type ] = true;
        }

        // Nullify elem to prevent memory leaks in IE
        // 设置为null避免IE中循环引用导致的内存泄露
        elem = null;
	},

jQuery从1.2.3版本引入数据缓存系统，贯穿内部，为整个体系服务，事件体系也引入了这个缓存机制，所以jQuery并没有将事件处理函数直接绑定到DOM元素上，而是通过.data存储在缓存.cahce上。

分析源码：

1.	定义变量与获取事件缓存对象
		
		var handleObjIn, eventHandle, tmp,
	        events, t, handleObj,
	        special, handlers, type, namespaces, origType,
	        //获取数据缓存
	        elemData = data_priv.get( elem );

	在$.cahce缓存中获取存储的事件缓存，如果没就新建elemData。

    elemData到底什么样了？通过把jQuery中的data_priv私有变量（存储事件缓存的变量）暴露出来(`jQuery.yhuData2=data_priv;`)，可以分析一下elemData结构：

    未添加任何事件时：<img src="/images/jquery/elemData1.png">

    为body添加click事件后：<img src="/images/jquery/elemData2.png">

    可见，elemData缓存对象存储了事件队列和事件处理函数，是事件的核心部分。


2.	添加唯一id

        // 保证handler有个唯一id，以便之后查找与删除
        if ( !handler.guid ) {
            handler.guid = jQuery.guid++;// 没有编号则添加编号
        }

    为每一个事件的句柄给一个标示，添加ID的目的是 用来寻找或者删除handler，因为缓存在缓存对象上，没有直接跟元素节点发生关联。

3.  分解事件名与句柄

        // elemData.events，是jQuery内部维护的事件列队
        if ( !(events = elemData.events) ) {
            events = elemData.events = {};
        }
        //elemData.handle，是实际绑定到elem中的事件处理函数
        if ( !(eventHandle = elemData.handle) ) {
            eventHandle = elemData.handle = function( e ) {
                return typeof jQuery !== core_strundefined && (!e || jQuery.event.triggered !== e.type) ?
                    jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
                    undefined;
            };
            // 为主handler添加一个elem属性
            // 元素没有让事件直接引用，而是挂载到数据缓存句柄上，很好的避免了IE泄露的问题
            eventHandle.elem = elem;
        }

    events，eventHandle 都是elemData缓存对象内部的。之后的代码无非就是对这2个对象的筛选，分组，填充。

4.  填充事件名与事件句柄

###结束

本章分析了jQuery事件的绑定。下一章分析事件的委派。