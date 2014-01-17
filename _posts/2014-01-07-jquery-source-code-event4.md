---
layout: default
title: 学习jQuery源码-事件4——自定义事件
postDate: 2013-01-07
tags: [jQuery, source code, event]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###自定义事件 

*“通过事件机制，可以将类设计为独立的模块，通过事件对外通信，提高了程序的开发效率。”*

####对象之间通过方法调用来交互

1.	对象A直接调用对象B的某个方法，实现交互。

	直接方法调用本质上也是属于一种特殊的发送与接受消息，它把发送消息和接收消息合并为一个动作完成。
	
	方法调用方和被调用方被紧密耦合在一起；因为发送消息和接收消息是在一个动作内完成，所以无法做到消息的异步发送和接收。

2.	对象A生成消息 -> 将消息通知给一个事件消息处理器（Observable）-> 消息处理器通过同步或异步的方式将消息传递给接收者。

	这种方式是通过将消息发送和消息接收拆分为两个过程，通过一个中间者来控制消息是同步还是异步发送。

	在消息通信的灵活性方面比较有优势，但是也带来了一定的复杂度。但是复杂度一般可以由框架封装，消息的发送方和接收方仍然可以做到比较简单。

总的来说就是一种松耦合的处理，2个对象之间有太多紧密的直接关联，应该要考虑通过消息通信解耦，从而提高应用程序的可维护性和重用性。

在JS中，消息的通知是通过事件表达的，当代码库增长到一定的规模，就需要考虑将行为和自定义事件进行解耦。

####自定义事件概念

*	类似DOM的行为：你在DOM节点（包括document对象）监听并触发自定义事件。这些事件既可以冒泡，也可以被拦截。这正是Prototype、jQuery和MooTools所做的。如果事件不能扩散，就必须在触发事件的对象上进行监听。
*	命名空间：一些框架需要你为你的事件指定命名空间，通常使用一个点号前缀来把你的事件和原生事件区分开。
*	自定义额外数据：JavaScript框架允许你在触发自定义事件时，向事件处理器传送额外的数据。jQuery可以向事件处理器传递任意数量的额外参数。
*	通用事件API：只用Dojo保留了操作原生DOM事件的正常API。而操作自定义事件需要特殊的发布/订阅API。这也意味着Dojo中的自定义事件不具有DOM事件的一些行为（比如冒泡）。 
*	声明：我们往往需要在预定义的事件中加入一些特殊的变化（例如，需要Alt键按下才能触发的单击事件），MooTools运行你定义此类自定义事件。此类事件需要预先声明，即便你只是声明他们的名字。任何未声明的自定义事件不会被触发。

####自定义事件案例

jQuery的自定义事件同样通过on绑定，然后再通过trigger来触发这个事件。

最简单的例子：

	//给element绑定hello事件
	element.bind("hello",function(){
	    alert("hello world!");
	});
	       
	//触发hello事件
	element.trigger("hello");

这个例子可能感觉不到使用自定义事件的好处，下面是一个更复杂点的例子。

这是一个选项卡插件，用自定义事件来完成选项卡切换。

HTML：

	<ul id="tabs">
	    <li data-tab="users">Users</li>
	    <li data-tab="groups">Groups</li>
	</ul>
	<div id="tabsContent">
	    <div data-tab="users">part1</div>
	    <div data-tab="groups">part2</div>
	</div>

jQuery：

	$.fn.tabs=function(control){
	    var element=$(this);
	    control=$(control);
	    element.delegate("li","click",function(){
	        var tabName=$(this).attr("data-tab");
	         //点击li的时候触发change.tabs自定义事件 
	        element.trigger("change.tabs",tabName);
	    });
	         
	    //给element绑定一个change.tabs自定义事件
	    element.bind("change.tabs",function(e,tabName){
	        element.find("li").removeClass("active");
	        element.find(">[data-tab='"+ tabName +"']").addClass("active");
	    });    
	    element.bind("change.tabs",function(e,tabName){
	        control.find(">[data-tab]").removeClass("active");
	        control.find(">[data-tab='"+ tabName +"']").addClass("active");
	    });
	    //激活第一个选项卡 
	    var firstName=element.find("li:first").attr("data-tab");
	    element.trigger("change.tabs",firstName);
	                 
	    return this;
	};

使用：`$("ul#tabs").tabs("#tabsContent");`

<br/>

###自定义事件上原生API与jQuery API的区别

原生API创建自定义事件与触发：

	var evt = document.createEvent('CustomEvent');// 创建了自定义事件对象
    evt.initCustomEvent('eventDemo', false, false, null);// 初始化该事件对象，事件名eventDemo
    document.dispatchEvent(evt);// 触发该事件

区别：

同时使用原生方法和jQuery方法：

1.	创建自定义事件：createEvent          直接绑定时指定事件名即可
2.	绑定自定义事件：addEventListener     on
3.	触发自定义事件：dispatchEvent        trigger

结果，dispatchEvent时，两个处理函数都执行；trigger时，只执行jQuery绑定的处理函数。

<br/>

###trigger API

####.trigger( eventType \[, extraParameters \] )

描述: 根据绑定到匹配元素的给定的事件类型执行所有的处理程序和行为。

参数：eventType:String;   extraParameters:Array, PlainObject

从jQuery 1.3开始，.trigger()事件会在DOM树上冒泡;在事件处理程序中返回false或调用事件对象中的.stopPropagation() 方法可以使事件停止冒泡。尽管 .trigger() 模拟了事件的激活，具备合成的 event 对象，但是它并没有完美的复制自然发生的事件（naturally-occurring event）。

若要触发通过 jQuery 绑定的事件处理函数，而不触发原生的事件，使用.triggerHandler() 来代替。

####常见用法

1.	模拟事件激活

		$("#btn").trigger("click");//模拟点击
		//简化写法
		$("#btn").click();

2.	触发自定义事件

	trigger()方法不仅能触发浏览器支持的具有相同名称的事件，也可以触发自定义名称的事件。

	例子可见上面的 自定义事件案例 。

3.	传递数据

	严格说还是第2种用法，单独列出来只为强调。

		$("#btn").bind("myClick", function (event, message1, message2) { //获取数据
		    $("#test").append("p" + message1 + message2 + "</p>");
		});
		$("#btn").trigger("myClick",["我的自定义","事件"]); //传递两个数据
		$(“#btn”).trigger(“myClick”,["我的自定义","事件"]); //传递两个数据

4.	执行默认操作

	triger()方法触发事件后，会执行浏览器默认操作。API说明已提到。triggerHandler()方法不会执行浏览器默认操作。


<br/>

###trigger源码解读

####jQuery.fn.trigger/triggerHandler——对外接口

	trigger: function( type, data ) {
	    return this.each(function() {
            jQuery.event.trigger( type, data, this );
        });
    },
    triggerHandler: function( type, data ) {
        var elem = this[0];
        if ( elem ) {
            return jQuery.event.trigger( type, data, elem, true );
        }
	}

代码简单，就是交给`jQuery.event.trigger`来真正执行。

####jQuery.event.trigger

	/**
    模拟事件触发,为了让事件模型在各浏览器上表现一致 (并不推荐使用)
    * @param {Object} event 事件对象 (原生Event事件对象将被转化为jQuery.Event对象)
    * @param {Object} data 自定义传入到事件处理函数的数据
    * @param {Object} elem HTML Element元素
    * @param {Boolen} onlyHandlers 是否不冒泡 true 表示不冒泡  false表示冒泡        
    */
	trigger: function( event, data, elem, onlyHandlers ) {

	    var i, cur, tmp, bubbleType, ontype, handle, special,
            eventPath = [ elem || document ],// 需要触发事件的所有元素队列
            // event是event对象，有type属性，取其type属性值，否则直接取event值（这时event可能是string）
            type = core_hasOwn.call( event, "type" ) ? event.type : event,// 指定事件类型
            // 事件是否有命名空间，有则分割成数组
            namespaces = core_hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

        cur = tmp = elem = elem || document;// elem:触发事件的本节点

        // Don't do events on text and comment nodes
        // 是text和comment节点则直接退出
        if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
            return;
        }

        // focus/blur morphs to focusin/out; ensure we're not firing them right now
        // focus/blur事件变种成focusin/out进行处理
        // 如果浏览器原生支持focusin/out，则确保当前不触发他们
        // rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
        if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
            return;
        }

        // 如果type有命名空间
        if ( type.indexOf(".") >= 0 ) {
            // Namespaced trigger; create a regexp to match event type in handle()
            // 则重新组装事件
            namespaces = type.split(".");
            type = namespaces.shift();// 精彩，namespaces数组第一个弹出来，则namespaces和type都正确了。
            namespaces.sort();
        }
        // 检测是否需要改成ontype形式，如"onclick"
        ontype = type.indexOf(":") < 0 && "on" + type;

        // Caller can pass in a jQuery.Event object, Object, or just an event type string
        // jQuery.expando:检测事件对象是否由jQuery.Event生成的实例，否则用jQuery.Event改造
        event = event[ jQuery.expando ] ?
            event :
            new jQuery.Event( type, typeof event === "object" && event );

        // Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
        // 对event预处理
        event.isTrigger = onlyHandlers ? 2 : 3;//开关，表示是trigger还是triggerHandler
        event.namespace = namespaces.join(".");
        event.namespace_re = event.namespace ?
            new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
            null;

        // Clean up the event in case it is being reused
        // 清除事件返回数据，以重新使用
        event.result = undefined;
        // 如果事件没有触发元素，则用elem代替
        if ( !event.target ) {
            event.target = elem;
        }

        // Clone any incoming data and prepend the event, creating the handler arg list
        // 如果data为空，则传入处理函数的是event，否则由data和event组成
        data = data == null ?
            [ event ] :
            jQuery.makeArray( data, [ event ] );

        // Allow special events to draw outside the lines
        // 尝试通过特殊事件进行处理，必要时候退出函数
        special = jQuery.event.special[ type ] || {};
        if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
            return;
        }

        // Determine event propagation path in advance, per W3C events spec (#9951)
        // Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
        // 如果 需要冒泡，特殊事件不需要阻止冒泡，且elem不是window对象
        if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

            // 冒泡时是否需要转成别的事件(用于事件模拟)
            bubbleType = special.delegateType || type;

            // 如果不是变形来的foucusin/out事件
            if ( !rfocusMorph.test( bubbleType + type ) ) {
                cur = cur.parentNode;// 则定义当前元素父节点
            }
            // 遍历自身及所有父节点
            for ( ; cur; cur = cur.parentNode ) {
                eventPath.push( cur );// 推入需要触发事件的所有元素队列
                tmp = cur;// 存一下循环中最后一个cur
            }

            // Only add window if we got to document (e.g., not plain obj or detached DOM)
            // 如果循环中最后一个cur是document，那么事件是需要最后触发到window对象上的
            // 将window对象推入元素队列
            if ( tmp === (elem.ownerDocument || document) ) {
                eventPath.push( tmp.defaultView || tmp.parentWindow || window );
            }
        }

        // Fire handlers on the event path
        // 触发所有该事件对应元素的事件处理器
        i = 0;
        // 遍历所有元素，并确保事件不需要阻止冒泡
        while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

            // 先确定事件绑定类型是delegateType还是bindType
            // i>1,也就是cur不是elem（是elem的祖先节点）时，是bubbleType
            event.type = i > 1 ?
                bubbleType :
                special.bindType || type;

            // jQuery handler
            // 检测缓存中该元素对应事件中包含事件处理器，
            // 有则取出主处理器(jQuery handle)来控制所有分事件处理器
            // 存在此事件类型（event.type），就把分发交给主handle（dispatch的包装）
            handle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );
            if ( handle ) {
                handle.apply( cur, data );
            }

            // Native handler
            // 取出原生事件处理器elem.ontype (比如click事件就是elem.onclick)     
            handle = ontype && cur[ ontype ];
            // 如果原生事件处理器存在，检测需不需要阻止事件在浏览器上的默认动作
            // 比如存在elem.onclick=function(){return false;};这时就要阻止事件在浏览器上的默认动作
            if ( handle && jQuery.acceptData( cur ) && handle.apply && handle.apply( cur, data ) === false ) {
                event.preventDefault();
            }
        }

        // 保存事件类型，因为这时候事件可能变了
        event.type = type;

        // If nobody prevented the default action, do it now
        // 如果不需要阻止默认动作，立即执行
        if ( !onlyHandlers && !event.isDefaultPrevented() ) {
            // 尝试通过特殊事件触发默认动作
            if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
                jQuery.acceptData( elem ) ) {

                // Call a native DOM method on the target with the same name name as the event.
                // Don't do default actions on window, that's where global variables be (#6170)
                // 调用一个原生的DOM方法具有相同名称的名称作为事件的目标。
                // 例如对于事件click，elem.click()是触发该事件
                // 并确保不对window对象阻止默认事件
                if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

                    // Don't re-trigger an onFOO event when we call its FOO() method
                    // 防止我们触发FOO()来触发其默认动作时，onFOO事件又触发了
                    tmp = elem[ ontype ];

                    if ( tmp ) {
                        elem[ ontype ] = null;
                    }

                    // Prevent re-triggering of the same event, since we already bubbled it above
                    // 当我们已经将事件向上起泡时，防止相同事件再次触发
                    jQuery.event.triggered = type;
                    elem[ type ]();// 触发事件
                    jQuery.event.triggered = undefined;// 触发后清除标记

                    // 事件触发完了，可以把监听重新绑定回去
                    if ( tmp ) {
                        elem[ ontype ] = tmp;
                    }
                }
            }
        }

        return event.result;
	},

源码还是有点复杂的，因为处理的hack很多，现在逐段分析：

1.	初始化变量阶段，注意3个变量：

		eventPath = [ elem || document ],

	eventPath就是冒泡路径中的各个element；eventPath[0]就是trigger时的本元素elem，没有则指定为document。

		type = core_hasOwn.call( event, "type" ) ? event.type : event,
		namespaces = core_hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

	event是原生event对象或jQuery.Event对象，type就是event.type，namespaces就是event.namespace切分的字符串数组。

2.	直接终止函数的判断：

	elem节点类型是 text 或 comment 直接退出；

	type是focusin，jQuery.event.triggered是focus；type是focusout，jQuery.event.triggered是blur时也直接退出。

	jQuery.event.triggered表示正在触发的事件类型。第二个判断主要是确保不当前立即触发，如果元素正在focus/blur的话。

3.	获取命名空间

	主要是应对`el.trigger('click.aaa.ccc')`这种形式。split和shift的连用还是很巧妙的。

		if ( type.indexOf(".") >= 0 ) {
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}

4.	赋值ontype

		ontype = type.indexOf(":") < 0 && "on" + type;

	type字符串中有 **':'** 吗？一般没有，所以一般ontype都是  "on" + type 。

4.	获取修正的事件对象event

	如果event是jQuery.Event对象，那么event[ jQuery.expando ]===true，用这个来判断event对象。

	获取后仍要修正一些属性。

		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

5.	修正触发事件时要传递的数据为数组

		data = data == null ? [ event ] : jQuery.makeArray( data, [ event ] );

	把data变为数组，新data就是[event,data]。

6.	jQuery.event.special

	这个在事件这一部分多次用到，是用来做模拟事件的，比如提到的模拟聚焦冒泡之类的，下章再讲。

7.	模拟事件冒泡

	trigger与triggerHandler的本质区别实现就在这里：

	onlyHandlers===true表示是triggerHandler，所以这里的判断是说：需要冒泡，并且elem不是window对象。至于special，从这里能进一步看出是模拟事件的，但解释分析在下一章。

		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {
			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

	确定bubbleType：bubbleType = special.delegateType || type;

	填充eventPath，冒泡一路冒到document（cur = cur.parentNode）。如果循环中最后一个cur是document（一般应该都是document），那么需要最后触发到window对象上。

8.	真正的触发事件，执行事件处理函数

	遍历每个节点，取出对应节点上的主事件句柄并执行（执行的是`dispatch`函数，`dispatch`执行真正的处理函数队列），并确保事件不需要阻止冒泡。

		i = 0;
		// 遍历所有元素，并确保事件不需要阻止冒泡
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {
			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			handle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}
  
			handle = ontype && cur[ ontype ];
			if ( handle && jQuery.acceptData( cur ) && handle.apply && handle.apply( cur, data ) === false ) {
				event.preventDefault();
			}
		}

	首先尝试执行jQuery事件处理函数，其次尝试执行原生的事件处理函数。事件处理函数中可能会执行`stopPropagation`等函数，所以while循环中检查是否阻止冒泡。

9.	如果不需要阻止默认动作，立即执行默认动作。

	代码很简单，但有一点不理解，**默认动作难道不是已经在第8点中执行了吗？**

	第8点：

		handle = ontype && cur[ ontype ];
		handle.apply( cur, data )

	而后面为什么又

		elem[type]();

###结束

这篇介绍了事件自定义，trigger触发等。下一篇分析事件剩下的special，即模拟事件。