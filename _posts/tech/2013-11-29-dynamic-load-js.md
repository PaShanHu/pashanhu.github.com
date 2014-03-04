---
layout: default
title: 怎么动态加载js？
category: tech
tags: [动态加载js, jQuery]
description: <p>要加载的js可能没法先行确定，或者只有运行时才知道要加载哪些js文件。本章讲了动态加载js或css文件的几种方法。</p>
---

感谢[Arnaud Leymet](http://stackoverflow.com/users/346005/arnaud-leymet)、[Evgeny](http://stackoverflow.com/users/110274/evgeny)和[rlemon](http://stackoverflow.com/users/829835/rlemon)在**Stack Overflow**的[Load JavaScript dynamically](http://stackoverflow.com/questions/7293344/load-javascript-dynamically)问题上的解答。这是我解决动态加载js问题的基础。

###问题怎么来的？

使用jekyll的过程中，解决了怎么为不同的post加载不同的css文件的问题。*通过在post的yaml头中加入需要加载的文件url，然后在post文件内或者模版内根据url来加载就行。*

比如：

yaml头：

	---
	layout: default
	title: xxx
	extraCss: /css/post.css
	...
	---

default模板：

	`{`% for cssUrl in page.extraCss %}
	    <link rel="stylesheet" href="{{ cssUrl }}">
	`{`% endfor %}

	输出：

	{% for cssUrl in page.extraCss %}
	    <link rel="stylesheet" href="{{ cssUrl }}">
	{% endfor %}	

同理，js也可以这样来解决。

但问题是，如果我用requirejs来加载其他js文件呢？main.js中没找到访问page等变量的方法。而且js的依赖关系使得混合使用requirejs和jekyll变量加载js存在一些问题。

另外，如果是在用户触发某些事件时才动态载入呢？显然jekyll无法解决。


###解决思路

换个思路，并不一定要在html中就已经用`<script type="text/javascript" ></script>`把所有js载入，可以把一些需要加载但又无需立即加载的文件的url记录下来，然后再require的main中再载入。

我们只需首先载入requirejs、jquery及其它一些必须的js，然后在main中根据需要动态加载。

###怎么动态加载？

1.  jquery.getScript()方法或其底层方法$.ajax()：
	
		$.ajax({
			url: urlString,
			dataType: "script",
			success: function(script,textStatus,jqXHR){
				console.log('load successfully');
				//do more
			}
		});

		$.getScript("ajax/test.js", function(data, textStatus, jqxhr) {
			console.log(data); //data returned
			console.log(textStatus); //success
			console.log(jqxhr.status); //200
			console.log('Load was performed.');
		});

2.  创建`<script type="text/javascript"></script>`节点来载入：

		function AddScriptTag(src) {
		    var node = document.getElementsByTagName("head")[0] || document.body;
		    if(node){
		        var script = document.createElement("script");
		        script.type="text/javascript";
		        script.src=src
		        node.appendChild(script);
		    } else {
		        document.write("<script src='"+src+"' type='text/javascript'></script>");
		    }
		}

###动态加载的优点

1.   按需加载，优化页面性能；

2.   更多的自定义，更大的可配置性；

3.   动态调节，解决一些固定加载无法解决的问题。如按客户端情况加载不同文件。