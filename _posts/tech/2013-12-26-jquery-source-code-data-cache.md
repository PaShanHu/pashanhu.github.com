---
layout: default
title: 学习jQuery源码-Data与Cache
category: tech
tags: [jQuery, source code, data]
extraCss: [/css/github.css]
extraJs: [/js/page/hight.js]
description: <p>jQuery源码学习笔记第8章，主要分析jQuery的缓存模块。</p>
---

感谢[Aaron的jQuery源码分析系列](http://www.cnblogs.com/aaronjs/p/3279314.html)。

本系列文章是学习jQuery源码的笔记，基于网络的各种教程与自己的理解而写（不会覆盖到每个点，可能存在错误），一来是记录学习成果;)，以后要用到时能方便找到；二来也帮助一下需要的人。

###Data与Cache

本章重点介绍Data，因为Data是Cache以及其它模块的基础。

###Data

Data模块是jQuery的基础模块，事件、异步等多个模块都要用到，贯穿始终。

Data模块主要由3部分组成：

1.	Data对象（类）定义，这是jQuery的Data模块的基础。
2.	通过jQuery.extend合并到jQuery对象，用`$.`调用的 Data API。
3.	通过jQuery.fn.extend合并到jQuery.fn对象，用`$(element).`调用的 Data API。
4.	其它的Data模块工具方法，比如dataAttr( elem, key, data )等。

####Data对象源码分析

jQuery通过定义一个Data类，把与数据相关的操作做了封装。**jQuery定义了内部的全局变量`data_user = new Data();`和`data_priv = new Data();`，这两个变量贯穿始终，所谓缓存就是存储到两者的属性上。而所有缓存相关的操作都是调用两者的方法。**

下面看看这个Data类：

1.	先看Data类的定义：

		function Data() {
		    // Support: Android < 4,
	        // Old WebKit does not have Object.preventExtensions/freeze method,
	        // return new empty object instead with no [[set]] accessor
	        Object.defineProperty( this.cache = {}, 0, {
	            get: function() {
	                return {};
	            }
	        });

	        this.expando = jQuery.expando + Math.random();
		}

	**Data类定义很简单，这段代码就是为Data类增加两个属性：**

	*	Data是jQuery内部定义的类。初始有 cache、expando 2个属性。
	*	this.cache是空对象{}，并定义了只读属性0；

			console.log(this.cache[0]);
			// 输出：Object {}

	*	讲一下Object.defineProperty函数。   
	*功能*是将属性添加到对象或修改现有属性的特性。实例：
			
			Object.defineProperty(object, propertyname, descriptor)
			//object 必需。 对其添加或修改属性的对象。
			//propertyname 必需。 一个包含属性名称的字符串。
			//descriptor 必需。 属性的描述符。 它可以针对数据属性或访问器属性。

			// Create a user-defined object.
			var obj = {};
			 
			// Add a data property to the object.
			Object.defineProperty(obj, "newDataProperty", {
			    value: 101,
			    writable: true,
			    enumerable: true,
			    configurable: true
			});
			// Add an accessor property to the object.
			Object.defineProperty(obj, "newAccessorProperty", {
			    set: function (x) {
			        document.write("in property set accessor" + newLine);
			        this.newaccpropvalue = x;
			    },
			    get: function () {
			        document.write("in property get accessor" + newLine);
			        return this.newaccpropvalue;
			    },
			    enumerable: true,
			    configurable: true
			});

2.	类属性与类方法

		Data.uid = 1;// 可作为cache的key

		//只允许 2种dom节点（元素、document）和任意Javascript对象
		Data.accepts = function( owner ) {
		    // Accepts only:
	        //  - Node
	        //    - Node.ELEMENT_NODE
	        //    - Node.DOCUMENT_NODE
	        //  - Object
	        //    - Any
	        return owner.nodeType ?
	            owner.nodeType === 1 || owner.nodeType === 9 : true;
	    };

3.	Data的原型结构

		Data.prototype = {
		    key:function(){},
		    ...
		}

	---

	以下4-10函数均是Data.prototype对象的属性。

4.	key( owner )
	
	*参数owner：*要添加数据的节点或js对象。    
	*功能：*为owner初始化一个属性并返回该属性的值：属性名this.expando，值一般是Data.uid++，显然值是唯一的；该值指向存储数据的缓存对象，即Data.cache[该值]。
	
		key: function( owner ) {
		    // We can accept data for non-element nodes in modern browsers,
	        // but we should not, see #8335.
	        // Always return the key for a frozen object.

	        // 到这一步应该彻底明白为什么要给Data.cache设置一个只读属性0了
	        // owner不是合理的节点或对象，返回0。
	        if ( !Data.accepts( owner ) ) {
	            return 0;
	        }

	        var descriptor = {},
	            // Check if the owner object already has a cache key
	            unlock = owner[ this.expando ];

	        // If not, create one
	        if ( !unlock ) {
	            unlock = Data.uid++;

	            // Secure it in a non-enumerable, non-writable property
	            try {
	                descriptor[ this.expando ] = { value: unlock };
	                //为owner定义属性 name:this.expando,value:unlock
	                //该属性能get，不能set，安全
	                Object.defineProperties( owner, descriptor );

	            // Support: Android < 4
	            // Fallback to a less secure definition
	            } catch ( e ) {
	                descriptor[ this.expando ] = unlock;
	                jQuery.extend( owner, descriptor );
	                //这种方法的this.expando属性可更改，不那么安全
	            }
	        }

	        // Ensure the cache object
	        // 保证cache属性被初始化为空对象
	        if ( !this.cache[ unlock ] ) {
	            this.cache[ unlock ] = {};
	        }

	        return unlock;
		},

	**`!Data.accepts( owner )`为true时返回 0 ：<del>Data.cache[0]是空对象，并且只读而无法更改，</del>就能防止各种错误发生了。**

	更正一个说法：

	![data_priv.cache[0]](/images/jquery/data_priv_cache0.png)

	**从图可以看出：data_priv.cache[0]的确是只读属性，get时的确返回`{}`空对象。    
	但重点是：`get cache[0]`时是创建一个全新空对象`{}`返回，我们可以对这个对象做任何事，这个对象跟cache[0]是 不等价 的。**

	**再强调一次，每次`get cache[0]`时都是返回一个全新的空对象`{}`。对这个全新对象做的任何事都与Data.cache没关系，两者是分隔开的。**

5.	set( owner,data,value )
	
	*功能：*为owner节点缓存数据。

	*使用：* `set(el,{key:value});` | `set(el,key,valuy);`

		set: function( owner, data, value ) {
		    var prop,
	            // There may be an unlock assigned to this node,
	            // if there is no entry for this "owner", create one inline
	            // and set the unlock as though an owner entry had always existed
	            // 从节点获取指向cache的‘指针’
	            unlock = this.key( owner ),
	            // 获取节点对应的cache
	            cache = this.cache[ unlock ];

	        // Handle: [ owner, key, value ] args
	        if ( typeof data === "string" ) {
	            cache[ data ] = value;

	        // Handle: [ owner, { properties } ] args
	        } else {
	            // Fresh assignments by object are shallow copied
	            if ( jQuery.isEmptyObject( cache ) ) {
	                jQuery.extend( this.cache[ unlock ], data );
	            // Otherwise, copy the properties one-by-one to the cache object
	            } else {
	                for ( prop in data ) {
	                    cache[ prop ] = data[ prop ];
	                }
	            }
	        }
			return cache;
		},

6.	get( owner, key )
	
	功能：获取owner节点缓存的数据。

		get: function( owner, key ) {
			// Either a valid cache is found, or will be created.
			// New caches will be created and the unlock returned,
			// allowing direct access to the newly created
			// empty data object. A valid owner object must be provided.
			var cache = this.cache[ this.key( owner ) ];

			return key === undefined ? //指定属性名则返回该属性值，否则返回整个缓存对象
				cache : cache[ key ];
		},

7.	access( owner, key, value )

	功能：get、set的综合，value存在的时候是set；value不存在，key是字符串或key也不存在，则get。

		access: function( owner, key, value ) {
			var stored;
			// In cases where either:
			//
			//   1. No key was specified
			//   2. A string key was specified, but no value provided
			//
			// Take the "read" path and allow the get method to determine
			// which value to return, respectively either:
			//
			//   1. The entire cache object
			//   2. The data stored at the key
			//
			if ( key === undefined ||
					((key && typeof key === "string") && value === undefined) ) {

				stored = this.get( owner, key );

				return stored !== undefined ?
					stored : this.get( owner, jQuery.camelCase(key) );
			}

			// [*]When the key is not a string, or both a key and value
			// are specified, set or extend (existing objects) with either:
			//
			//   1. An object of properties
			//   2. A key and value
			//
			this.set( owner, key, value );

			// Since the "set" path can have two possible entry points
			// return the expected data based on which path was taken[*]
			return value !== undefined ? value : key;
		},

8.	remove( owner, key )

	功能：删除指定的key对应的数据，key可以是数组、字符串（空格分割多个key）。key为空时，删除节点上的所有数据。

	有一点要注意，函数会尝试将key转为驼峰形式，并删除驼峰形式和非驼峰形式的key对应的数据。

		remove: function( owner, key ) {
			var i, name, camel,
				unlock = this.key( owner ),// owner属性：指向缓存对象的“指针”
				cache = this.cache[ unlock ];// owner对应的缓存
			// key不存在，删除所有缓存数据
			if ( key === undefined ) {
				this.cache[ unlock ] = {};

			} else {
				// Support array or space separated string of keys
				// key是类数组
				if ( jQuery.isArray( key ) ) {
					// If "name" is an array of keys...
					// When data is initially created, via ("key", "val") signature,
					// keys will be converted to camelCase.
					// Since there is no way to tell _how_ a key was added, remove
					// both plain key and camelCase key. #12786
					// This will only penalize the array argument path.
					name = key.concat( key.map( jQuery.camelCase ) );
				} else {// key不是类数组
					camel = jQuery.camelCase( key );
					// Try the string as a key before any manipulation
					if ( key in cache ) {
						// key在cache中存在，肯定是标准的key形式，不可能是空格间隔的多个key；
						// 则添加驼峰形式
						name = [ key, camel ];
					} else {
						// If a key with the spaces exists, use it.
						// Otherwise, create an array by matching non-whitespace
						// 不在cache中存在，如果是空格隔开的多个key，切分
						name = camel;
						name = name in cache ?
							[ name ] : ( name.match( core_rnotwhite ) || [] );
					}
				}

				i = name.length;// 此时name已是数组形式
				while ( i-- ) {
					delete cache[ name[ i ] ];// 删除所有符合的key
				}
			}
		},

9.	hasData( owner )

	功能：测试该节点是否有缓存数据。

		hasData: function( owner ) {
		    return !jQuery.isEmptyObject(
		        // 尝试获取该节点的cache，不存在则给出空对象{}
	            this.cache[ owner[ this.expando ] ] || {}
	        );
		},

10.	discard( owner )

	功能：删除节点对应的所有数据。

		discard: function( owner ) {
		    if ( owner[ this.expando ] ) {
	            delete this.cache[ owner[ this.expando ] ];
	        }
		}

####jQuery.extend的Data API源码分析

	jQuery.extend({
	    acceptData: Data.accepts,

        hasData: function( elem ) {
            return data_user.hasData( elem ) || data_priv.hasData( elem );
        },

        data: function( elem, name, data ) {
            return data_user.access( elem, name, data );
        },

        removeData: function( elem, name ) {
            data_user.remove( elem, name );
        },

        // TODO: Now that all calls to _data and _removeData have been replaced
        // with direct calls to data_priv methods, these can be deprecated.
        _data: function( elem, name, data ) {
            return data_priv.access( elem, name, data );
        },

        _removeData: function( elem, name ) {
            data_priv.remove( elem, name );
        }
	});

这段源码就不详细分析了，基本就是Data对象方法的调用与再封装，很简单。

####Data模块辅助方法dataAttr源码分析

因为在jQuery.fn.data中用到了dataAttr方法，所以提前看一下。

	// 就是获取HTML5的"data-"属性并作为数据添加到缓存
	function dataAttr( elem, key, data ) {
	    var name;

        // If nothing was found internally, try to fetch any
        // data from the HTML5 data-* attribute
        // data不存在，且elem是元素节点
        // 则获取
        if ( data === undefined && elem.nodeType === 1 ) {
            // 处理key：开头+"data-"，在大写字母前加'-'，整体转化为小写。
            // 其实就是逆驼峰
            name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();
            data = elem.getAttribute( name );

            //对获取的data进行值的处理，比如true、false形式的字符串变为bool
            if ( typeof data === "string" ) {
                try {
                    data = data === "true" ? true :
                        data === "false" ? false :
                        data === "null" ? null :
                        // Only convert to a number if it doesn't change the string
                        +data + "" === data ? +data :
                        rbrace.test( data ) ? JSON.parse( data ) :
                        data;
                } catch( e ) {}

                // Make sure we set the data so it isn't changed later
                // 把获取的数据设置到缓存中
                data_user.set( elem, key, data );
            } else {
                data = undefined;
            }
        }
        return data;
	}

####jQuery.fn.extend的Data API源码分析

	jQuery.fn.extend({

	//数据get、set操作
	data: function( key, value ) {
	    var attrs, name,
            elem = this[ 0 ],
            i = 0,
            data = null;

        // Gets all values
        // key不存在，即没有传参，则获取所有数据
        if ( key === undefined ) {

            if ( this.length ) {
                data = data_user.get( elem );// 获取该节点/对象已有数据
                // 未设置key，所以返回的是elem对应的整个数据对象cache
                

                // important!!!!
                // data就是这个cache的映射，cache变化，data变化
                // 所以下面执行dataAttr( elem, name, data[ name ] );
                // dataAttr中的data_user.set( elem, key, data );把HTML5的data-属性更新到这个cache；
                // data就同步更新了，所以是能获取到所有数据的


                // 是element节点，并且没有获取过data-属性
                if ( elem.nodeType === 1 && !data_priv.get( elem, "hasDataAttrs" ) ) {
                    attrs = elem.attributes;
                    for ( ; i < attrs.length; i++ ) {
                        name = attrs[ i ].name;

                        if ( name.indexOf( "data-" ) === 0 ) {
                            name = jQuery.camelCase( name.slice(5) );
                            // 这一步将把同名的"data-"属性作为数据添加到缓存
                            // 此时，data会被设置成"data-"属性的值

                            dataAttr( elem, name, data[ name ] );
                        }
                    }
                    data_priv.set( elem, "hasDataAttrs", true );
                }
            }

            return data;
        }

        // Sets multiple values
        // key是对象，则递归set所有键值对
        if ( typeof key === "object" ) {
            return this.each(function() {
                data_user.set( this, key );
            });
        }

        // 正常情况，key存在，且不是对象
        // 又是jQuery.access函数
        return jQuery.access( this, function( value ) {
            var data,
                camelKey = jQuery.camelCase( key );

            // The calling jQuery object (element matches) is not empty
            // (and therefore has an element appears at this[ 0 ]) and the
            // `value` parameter was not undefined. An empty jQuery object
            // will result in `undefined` for elem = this[ 0 ] which will
            // throw an exception if an attempt to read a data cache is made.
            // this[0]存在且value未传参，则获取key对应的value
            // 首先尝试获取key对应的value
            // 其次尝试获取key的驼峰形式的value
            // 最后获取html5的data-属性值
            if ( elem && value === undefined ) {
                // Attempt to get data from the cache
                // with the key as-is
                data = data_user.get( elem, key );
                if ( data !== undefined ) {
                    return data;
                }

                // Attempt to get data from the cache
                // with the key camelized
                data = data_user.get( elem, camelKey );
                if ( data !== undefined ) {
                    return data;
                }

                // Attempt to "discover" the data in
                // HTML5 custom data-* attrs
                data = dataAttr( elem, camelKey, undefined );
                if ( data !== undefined ) {
                    return data;
                }

                // We tried really hard, but the data doesn't exist.
                return;
            }

            // Set the data...
            // 设置数据
            // 设置驼峰形式以及真实的带'-'的形式（如果是）
            this.each(function() {
                // First, attempt to store a copy or reference of any
                // data that might've been store with a camelCased key.
                var data = data_user.get( this, camelKey );

                // For HTML5 data-* attribute interop, we have to
                // store property names with dashes in a camelCase form.
                // This might not apply to all properties...*
                data_user.set( this, camelKey, value );

                // *... In the case of properties that might _actually_
                // have dashes, we need to also store a copy of that
                // unchanged property.
                if ( key.indexOf("-") !== -1 && data !== undefined ) {
                    data_user.set( this, key, value );
                }
            });
        }, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each(function() {
			data_user.remove( this, key );
		});
	}

代码的分析已经由注释给出。但要强调3点：

1.	data操作，或者说数据是存储在data_user这个jQuery的全局变量上。data_priv在这一块只存储了是否有并且已处理了 HTML5 'data-' 属性的标志。
2.	jQuery.fn.data是怎么get所有数据的（包括 'data-' 属性）？data获取的时候只是获取了指向特定节点的缓存的引用（若第一次，此时 'data-' 属性未处理），然后通过dataAttr函数，把 'data-' 属性更新到了该节点的缓存，ok，此时所有数据就获取到了。
3.	万恶的`jQuery.access`接口。当然，最重要的fn参数已解释，现在说一下access在data模块调用时的执行流程。

	access接口：elems, fn, key, value, chainable, emptyGet, raw    
	对应参数：this, fn, null, value,arguments.length > 1, null, true    
	获取数据时：data() / data(key)，此时arguments.length > 1是false，即不是链式chainable；    
	设置数据时：key是对象的情况已处理，此时arguments.length > 1必然是true，是链式chainable。

		access: function( elems, fn, key, value, chainable, emptyGet, raw ) {
		    console.log('处在access中,length,bulk,elems,fn,key,value,chainable,raw');

            var i = 0,
                length = elems.length,
                bulk = key == null;//在data调用时，key传参null，bulk为true

            // 忽略，因为key为null
            if ( jQuery.type( key ) === "object" ) {
                chainable = true;
                for ( i in key ) {
                    jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
                }

            // 设置data，即set
            } else if ( value !== undefined ) {
                chainable = true;

                if ( !jQuery.isFunction( value ) ) {
                    raw = true;// value不是函数，则raw设为true
                }

                // data操作时必然true
                if ( bulk ) {
                    // value不是函数
                    if ( raw ) {
                        //value不是函数，直接执行fn，传参elems，value
                        //elems在prop、attr传参时赋的是this
                        fn.call( elems, value );
                        fn = null;//fn置为null

                    // ...except when executing function values
                    // 除非value是函数
                    } else {
                        // 把fn传给bulk；
                        bulk = fn;
                        // fn置为函数，该函数设置this=jQuery( elem );然后执行jQuery.attr/prop(value);
                        fn = function( elem, key, value ) {
                            return bulk.call( jQuery( elem ), value );
                        };
                    }
                }

                if ( fn ) {        
                    //fn存在，开始正式执行fn
                    for ( ; i < length; i++ ) {
                        fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
                    }
                }
            }

            // 返回值，get 数据在这一步才真正执行
            return chainable ?
                elems ://chainable  true，链式调用返回的就是元素集合本身。

                // Gets//如果不是链式调用，那么是 get 类方法，在这里是get data
                bulk ?//data情况下bulk 为 true，即调用fn并将执行结果返回
                    fn.call( elems ) :
                    length ? fn( elems[0], key ) : emptyGet;
		},

	代码还是清晰的，即get data时执行了`fn()`，set data时执行了`fn( elems[i], key,  value )`。

###Cache

####Cache的作用

jQuery从1.2.3版本引入数据缓存系统，因为在之前没有数据缓存时，事件系统有几个问题：

1.	没有一个系统的缓存机制，事件的回调都放到EventTarget之上，这会引发循环引用；
2.	如果EventTarget是window对象，会引发全局污染；
3.	不同模块之间用不同缓存变量。

引入Cache后：

1.	允许我们在DOM元素上附加任意类型的数据,避免了循环引用的内存泄漏风险；
2.	用于存储跟dom节点相关的数据，包括事件，动画等；
3.	一种低耦合的方式让DOM和缓存数据能够联系起来。

jQuery缓存系统的真正魅力在于其内部应用中，动画、事件等都有用到这个缓存系统。试想如果动画的队列都存储到各DOM元素的自定义属性中，这样虽然可以方便的访问队列数据，但也同时带来了隐患。如果给DOM元素添加自定义的属性和过多的数据可能会引起内存泄漏，所以要尽量避免这么干。

####数据缓存接口jQuery.data( element, key, value )

因为Data分析自认为已比较透彻，所以不再解释。

####Cache实现解析

数据缓存就是在目标对象与缓存体间建立一对一的关系,整个Data类其实都是围绕着 thia.cache 内部的数据做 *增删改查* 的操作。

这种一对一关系怎么实现的？

1.	在jQuery内部创建一个cache对象{}, 来保存缓存数据。

		function Data() {
		    Object.defineProperty( this.cache = {}, 0, {
		        get: function() {把每个节点的dom[expando]的值都设为一个自增的变量id，保持全局唯一性。 这个id的值就作为cache的key用来关联DOM节点和数据。也就是说cache[id]就取到了这个节点上的所有缓存，即id就好比是打开一个房间(DOM节点)的钥匙。 而每个元素的所有缓存都被放到了一个map映射里面，这样可以同时缓存多个数据。
		            return {};
		        }
		    });
		    this.expando = jQuery.expando + Math.random();
		}
		// Data类的定义：cache对象，expando属性（使用expando+随机数，重复的可能很小）

2.	然后往需要进行缓存数据的DOM节点上扩展一个 **name为expando，value为Data.uid++** 的属性。

	下面代码是在key函数中，由Data.set调用:

		descriptor[ this.expando ] = { value: unlock };
		//为owner定义属性 name:this.expando,value:unlock
		//该属性能get，不能set，安全
		Object.defineProperties( owner, descriptor );

	这是在owner节点上添加 **name为expando，value为Data.uid++** 的属性，真正把一对一关系建立起来。uid自增来维持唯一性。

3.	cache相应操作

		cache = this.cache[ owner[this.expando] ];

	这是在全局的cache对象上建立一个子cache对象：name：uid1，value：object。cache结构应该是这样子的：

		var cache = {
		    "uid1": { // DOM节点1缓存数据，
		        "name1": value1,
		        "name2": value2
		    },
		    "uid2": { // DOM节点2缓存数据，
		        "name1": value1,
		        "name2": value2
		    }
		    // ......
		};


###结束

jQuery.Deffered() 包装了jQuery.Callbacks()，其中的嵌套还是有些复杂的。下一篇分析Deffered中的`when`函数。