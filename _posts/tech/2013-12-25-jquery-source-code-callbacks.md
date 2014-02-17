---
layout: default
title: 学习jQuery源码-Callbacks
category: tech
tags: [jQuery, source code, callback]
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第7章，主要内容是jQuery.Callbacks。</p><p>本章讲jQuery的回调（callback），从callback的API入手，深入源码，分析回调的内部实现。</p>
---
####声明

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，所以不会很详细，也不会覆盖到每个点，只是对一些重难点的记录分析，以用于日后温习。

###Callbacks介绍

jQuery.Callbacks()在版本1.7中新加入，是一个多用途的回调函数列表对象，提供了一种强大的方法来管理回调函数队列。

####简单使用

获取Callbacks对象，使用其方法添加/删除回调方法，触发回调。

	
	function fn1( value ) {
	    console.log( value );
	}
	function fn2( value ) {
	    fn1("fn2 says: " + value);
	    return false;
	}

	var callbacks = $.Callbacks();
	callbacks.add( fn1 );
	 
	// outputs: foo!
	callbacks.fire( "foo!" );
	 
	callbacks.add( fn2 );
	 
	// outputs: bar!, fn2 says: bar!
	callbacks.fire( "bar!" );


####参数与方法说明

#####Possible flags

$.Callbacks()可传入4种flag，创建适应不同场景的callback。

1.  once: 确保这个回调列表只执行（ .fire() ）一次。
	
		var callbacks = $.Callbacks( "once" );
		callbacks.add( fn1 );
		callbacks.fire( "foo" );  //输出：foo
		callbacks.add( fn2 );
		callbacks.fire( "bar" );  //无输出
		callbacks.remove( fn2 );
		callbacks.fire( "foobar" );  //无输出
		//  可见，once下，回调函数只能执行一次！

2.  memory: 保持以前的值，将添加到这个列表的后面的最新的值立即执行调用任何回调。

		var callbacks = $.Callbacks( "memory" );
		callbacks.add( fn1 );
		callbacks.fire( "foo" );  //输出：foo
		
		callbacks.add( fn2 );  
		//没有调用fire，立即输出：
		//** fn2 says: foo **

		callbacks.fire( "bar" );
		//输出：bar
		//      fn2 says: bar 

		callbacks.remove( fn2 );
		callbacks.fire( "foobar" );//输出：foobar
		//  可见，memory下，callback记录之前的参数，新加入（add）回调函数后立即执行fire，调用此函数。

3.  unique: 确保一次只能添加一个回调(所以在列表中没有重复的回调)。

		var callbacks = $.Callbacks( "unique" );
		callbacks.add( fn1 );
		callbacks.fire( "foo" );  //输出：foo
		callbacks.add( fn1 ); // repeat addition
		callbacks.add( fn2 );
		callbacks.fire( "bar" );
		//输出：bar
		//      fn2 says: bar 
		callbacks.remove( fn2 );
		callbacks.fire( "foobar" );  //输出：foobar
		//  可见，unique确保不添加已有的回调函数，即列表中函数不重复。

4.  stopOnFalse: 当一个回调返回false 时中断调用。

		function fn1( value ){
		    console.log( value );
		    return false;
		} 
		function fn2( value ){
		    fn1( "fn2 says: " + value );
		    return false;
		}
		 
		var callbacks = $.Callbacks( "stopOnFalse" );
		callbacks.add( fn1 );
		callbacks.fire( "foo" );  //输出：foo
		callbacks.add( fn2 );
		callbacks.fire( "bar" );  //输出：bar //因为fn1返回false，fn2未调用。
		
		callbacks.remove( fn2 );
		callbacks.fire( "foobar" );  //输出：foobar
		//  可见，stopOnFalse在回调函数return false;时终止调用。


**注意：**

**设置flag时可以设置多个，如`$.Callbacks("unique memory")`。**

#####jQuery.Callbacks()的API

	callbacks.add()        回调列表中添加一个回调或回调的集合。
	callbacks.disable()    禁用回调列表中的回调
	callbacks.disabled()   确定回调列表是否已被禁用。 
	callbacks.empty()      从列表中删除所有的回调.
	callbacks.fire()       用给定的参数调用所有的回调
	callbacks.fired()      访问给定的上下文和参数列表中的所有回调。 
	callbacks.fireWith()   访问给定的上下文和参数列表中的所有回调。
	callbacks.has()        确定列表中是否提供一个回调
	callbacks.lock()       锁定当前状态的回调列表。
	callbacks.locked()     确定回调列表是否已被锁定。
	callbacks.remove()     从回调列表中的删除一个回调或回调集合。


###callback.js源码分析

jQuery版本：2.0.3 | callback.js代码量：200行左右

####整体分析

$.Callbacks源码很少，是一个工厂函数。它使用函数调用（非new，它不是一个类）创建对象，用一个可选参数flags用来设置回调函数的行为。

结构：

	jQuery.Callbacks = function( options ) {

		options = typeof options === "string" ?
			( optionsCache[ options ] || createOptions( options ) ) :
			jQuery.extend( {}, options );

		//变量定义
		var ...

			fire=function(data){
				...
			},

			self={
				...
			};

		return self;//真正的Callbacks对象
	}

####不起眼但重要的optionsCache

在定义jQuery.Callbacks之前，闭包内定义了一个变量optionsCache和一个函数createOptions。

因为闭包的原理，optionsCache将停留在内存。

	// String to Object options format cache
	var optionsCache = {};

	// Convert String-formatted options into Object-formatted ones and store in cache
	function createOptions( options ) {
	    var object = optionsCache[ options ] = {};
        jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
            object[ flag ] = true;//以空格切分参数options，切分出来的值（once等）传入optionsCache作为属性，并设为true
        });
        return object;
	}

**分析：**

*	createOptions函数作用是什么？
	*	参数options是字符串，函数首先初始化`optionsCache[ options ] = {}`。
	*	然后用空格切分options为数组，遍历这个数组，执行`optionsCache[ options ][flag]=true`。
	*	用例子来简单说明：

			$.Callbacks('unique once');// options='unique once'

			调用createOptions，则
			optionsCache['unique once']={};
			//options切分为['unique','once'];
			//然后
			optionsCache['unique once']['unique']=true;
			optionsCache['unique once']['once']=true;

		这就是createOptions做的事。
*	把参数情况（4种flag的某些）缓存到optionsCache有什么用？怎么用？

		$.Callbacks的某些API都会用到。比如add函数中的判断`!options.unique`。可见，缓存下来可以非常方便的判断当前callback对象的性质。


####核心函数add/remove

#####功能

往回调函数队列中添加/删除函数项。

#####add
	
	...
	list = [],// 回调函数列表
	...
	add: function() {
		if ( list ) {
			//首先存储当前列表长度
			var start = list.length;
			//用一个立即执行的add函数来添加回调
			//直接遍历传过来的arguments进行push
			(function add( args ) {
				jQuery.each( args, function( _, arg ) {
					var type = jQuery.type( arg );
					//如果所传参数为函数，则push
					if ( type === "function" ) {
						if ( !options.unique || !self.has( arg ) ) {
							//当$.Callbacks('unique')时，保证列表里面不会出现重复的回调
							list.push( arg );
						}
					} else if ( arg && arg.length && type !== "string" ) {
						//假如传过来的参数为数组或array-like，则继续调用添加;
						//从这里可以看出add的传参可以有add(fn),add([fn1,fn2]),add(fn1,fn2)
						// Inspect recursively 递归检查
						add( arg );
					}
				});
			})( arguments );
			// 如果回调列表中的回调正在执行时，其中的一个回调函数执行了Callbacks.add操作
            	// 即如果在执行Callbacks.add操作的状态为firing时
            	// 那么更新firingLength值
			if ( firing ) {
				firingLength = list.length;
			} else if ( memory ) {
				//如果options.memory为true，则将memory做为参数，应用最近增加的回调函数
				
				firingStart = start;
				fire( memory );
				
				//即$.Callbacks( "memory" )时，add添加的回调函数会**立即执行**
				//并且此回调函数调用时的参数存储在 memory 变量中
			}
		}
		return this;
	}

#####remove

	remove: function() {
		if ( list ) {
			jQuery.each( arguments, function( _, arg ) {
				var index;

				//在while循环中，借助jQuery.inArray删除函数列表中相同的函数引用（没有设置unique的情况）
				//jQuery.inArray将每次返回查找到的元素的index作为自己的第三个参数继续进行查找，直到函数列表的尽头
				//splice删除数组元素，修改数组的结构
				while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
					list.splice( index, 1 );
					//如果函数列表处于firing状态时，则维护firingLength和firgingIndex这两个值，
					//保证fire时函数列表中的函数能够被正确执行（fire中的for循环需要这两个值
					if ( firing ) {
						if ( index <= firingLength ) {
							firingLength--;
						}
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				}
			});
		}
		return this;
	}

####核心函数fire

#####功能

调用回调函数队列，调用顺序：self.fire –> self.fireWith –> fire。

#####self.fire/self.fireWith/fire

	self.fire: function() {
		self.fireWith( this, arguments );
		return this;
	},
	self.fireWith: function( context, args ) {
		if ( list && ( !fired || stack ) ) {
			args = args || [];
			args = [ context, args.slice ? args.slice() : args ];
			//如果正在回调
			if ( firing ) {
				//将参数推入堆栈，等待当前回调结束再调用
				stack.push( args );
			} else {//否则直接调用
				fire( args );
			}
		}
		return this;
	}

---

	// 触发回调函数列表
	fire = function( data ) {
		//如果参数memory为true，则记录data
		//options.memory=true；则memory=data。
		memory = options.memory && data;
		fired = true;//已触发过
		firingIndex = firingStart || 0;//正在触发的回调函数的索引
		firingStart = 0;
		firingLength = list.length;
		firing = true;//正在调用

		//表达式list && firingIndex < firingLength;
		// list为true，那么firingIndex < firingLength即为表达式结果
		// list为false，表达式list && firingIndex < firingLength;为false
		for ( ; list && firingIndex < firingLength; firingIndex++ ) {
			// data[0]是context；data[1]是arguments
			if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
				memory = false; // 阻止未来add引起的调用
				break;
				//因为stopOnFalse为true，所以当回调函数返回false时退出循环
			}
		}
		
		firing = false;
		if ( list ) {
			//如果堆栈存在
			if ( stack ) {
				if ( stack.length ) {//如果堆栈不为空
					//从堆栈头部取出，递归fire。
					fire( stack.shift() );
				}
			//否则，如果memory==true
			} else if ( memory ) {
				list = [];//列表清空
			//否则禁用回调列表中的回调
			} else {
				self.disable();
			}
		}
	}

####其它函数较为简单，略。

###结束

jQuery.Callbacks() 比较简单，下一篇将分析基于其上的Deffered。