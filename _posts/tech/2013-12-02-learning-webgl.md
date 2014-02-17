---
layout: default
title: WebGL学习笔记（1）
category: tech
tags: [webgl, 3D, canvas, html5]
extraCss: /css/post.css
description: <p>HTML5带来了canvas标签，通过canvas我们可以动态绘制图形、图像、表格。而当这些与WebGL结合时，令人激动与期待的事情发生了。</p><p>欣赏了一些绚丽的demo，产生了学习WebGL的冲动，本章即是学习笔记系列的第一章。</p>
---
####说明

感谢[mozilla 的WebGL教程](https://developer.mozilla.org/en-US/docs/Web/WebGL/Getting_started_with_WebGL?redirectlocale=en-US&redirectslug=WebGL%2FGetting_started_with_WebGL)。

另外，<http://www.cnblogs.com/muse/archive/2011/11/29/2268056.html>和<http://blog.csdn.net/huanghuangyy/article/details/6954767>也有参阅。

###开始

WebGL是一个附加的渲染上下文（context），支持HTML5的canvas对象。这个上下文允许通过一种与OpenGL ES 2.0 API非常相似的API来进行3D图像渲染。

####准备工作

第一件事是准备一个canvas，以下一段html代码建立了一个canvas，并通过`start()`函数初始化`WebGL context`：

	<body onload="start()">
	  <canvas id="glcanvas" width="640" height="480">
	    Your browser doesn't appear to support the HTML5 <code>&lt;canvas&gt;</code> element.
	  </canvas>
	</body>

####获取WebGL context

`start()`函数，在文档加载后立即执行，它的任务是建立webgl上下文并渲染内容。

	function start() {
		canvas = document.getElementById("glCVS");

		gl = initWebGL(canvas);      // Initialize the GL context

		// Only continue if WebGL is available and working

		if (gl) {
			gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
			gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
			gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
			gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.

			// Initialize the shaders; this is where all the lighting for the
		    // vertices and so forth is established.
		    
		    initShaders();
		    
		    // Here's where we call the routine that builds all the objects
		    // we'll be drawing.
		    
		    initBuffers();
		    
		    // Set up to draw the scene periodically.
		    
		    setInterval(drawScene, 15);
		}
	};

上面的代码做了以下3件事：

1.  获取canvas的引用，存入canvas变量中；
2.  用`initWebGL(canvas)`函数来初始化webgl上下文；
3.  如果context成功初始化，do something more。在这里是clear color to black，clear the context to that color。然后用参数配置context（允许depth testing 和指定近物遮挡远物）。然后绘制矩形。

####创建 WebGL context

	function initWebGL(canvas) {
	  gl = null;
	  
	  try {
	    // Try to grab the standard context. If it fails, fallback to experimental.
	    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	  }
	  catch(e) {}
	  
	  // If we don't have a GL context, give up now
	  if (!gl) {
	    alert("Unable to initialize WebGL. Your browser may not support it.");
	    gl = null;
	  }
	  
	  return gl;
	}

####更改WebGL context的尺寸（Resizing）

新的webgl context在被获取时立即设置自己的视口（viewport）分辨率为canvas的宽高。

**更改canvas的样式只会改变上下文的显示尺寸，不会改变渲染分辨率；同样在上下文被获取后更改canvas的宽高也不会改变渲染分辨率。**

要改变webgl context的渲染分辨率，请用`viewport()`。

	gl.viewport(0, 0, canvas.width, canvas.height);

canvas渲染分辨率与css样式不同时将会缩放。

###绘制平面矩形

首先明白一点：即使绘制2D图形，我们仍是在3D空间绘制。

####初始化着色器

着色器用GLSL语言编写。详细可参阅[OpenGL ES Shading Language](http://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf)。

为了易读性和可维护性，着色器写在html文档中，而不是全部放在js代码里。Shader代码可以直接写在script标记中，ContentType为`x-shader/x-vertex`和`x-shader/x-fragment`两类，对应Vertex shader和Fragment shader两种着色器。

#####shader 着色器

---
**fragment**：片段，多边形上的每个像素。*片段着色器的工作是确立每个像素的颜色。*在本小节，就是简单为每个像素赋值白色。

`gl_FragColor`是GL内置的变量，用于存储片段的颜色。

	<script id="shader-fs" type="x-shader/x-fragment">
	  void main(void) {
	    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
	  }
	</script>

**vertex shader**：顶点着色器，定义了每个顶点的位置和形状。比如，两个点A和B可以确定一条线段，那么，在3D中，我们就说，A和B是线段AB的顶点。WebGL使用三角形每个顶点存储的信息来生成并填充其他所有需要输出的像素。

`gl_Position`是GL内置的变量，用于存储经过转换的顶点信息。

	<script id="shader-vs" type="x-shader/x-vertex">
	  attribute vec3 aVertexPosition;

	  uniform mat4 uMVMatrix;
	  uniform mat4 uPMatrix;
	  
	  void main(void) {
	    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
	  }
	</script>
---

#####从DOM加载shader

1.  获取script标记中的代码。
	
		var WebGLHelper={};
		WebGLHelper.getEl=function(id){
			return typeof id ==='string'? document.getElementById(id):id;
		}
		WebGLHelper.getCode=function(script){
			if(!(script=this.getEl(script))) return null;
			var source='';child=script.firstChild;
			while(!!child){
				if(child.nodeType==3){
					source+=child.textContent;
				}
				child=child.nextSibling;
			}
			child=script=null;
			return source;
		}

	其实，就是将script标记中的文本节点——也就是代码段——组合成一个字符串。虽然MDN中讲到，为了方便扩展和改写，推荐将Shader以script标记的方式混写在HTML中，但是本质上，最终还是以字符串方式来调用。换句话说，我们可以将既定的Shaper代码定义在js中，根据不同的运行需求来动态调用。

2.  根据MIME类型创建shader

	假设已获取两段Shader代码，赋值给两个变量testVertexCode和testFragmentCode，并有WebGL对象gl，我们需要得到两个相应的Shader对象：

		//顶点着色器
		//script.type == "x-shader/x-vertex"

		var vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertShader, testVertexCode);
		gl.compileShader(vertShader);
		
		//片段着色器
		//script.type == "x-shader/x-fragment"

		var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragShader, testFragmentCode);
		gl.compileShader(fragShader);

3.  绑定shader并初始化

	主要分3步：

	1.  创建一个编程对象作为Shader的容器；
	2.  将Shader附加到编程对象中；
	3.  让WebGL关联和引用该编程对象。

	代码：

		var program = gl.createProgram();
		gl.attachShader(program, vertShader);
		gl.attachShader(program, fragShader);
		gl.linkProgram(program);
		gl.useProgram(program);
		//其它初始化工作
		vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  		gl.enableVertexAttribArray(vertexPositionAttribute);


以上，第一点是获取shader的代码段，2、3是创建并使用shader。

####创建绘制对象

下面绘制四个顶点来组成一个白色矩形。在WebGL中建立一个缓存区来存储要绘制的图形：

	var vertices = [  
	    1.0,  1.0,  0.0,  
	    -1.0, 1.0,  0.0,  
	    1.0,  -1.0, 0.0,  
	    -1.0, -1.0, 0.0  
	];
	var squareVerticesBuffer = gl.createBuffer();//创建buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);//绑定到context

	//将js数组转化为WebGL floats数组，并传入`bufferData`函数以确立对象的顶点。
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

####绘制

在着色器和绘制对象都初始化完成后，可以正式渲染场景了。

	function drawScene() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		perspectiveMatrix = makePerspective(45, 640.0/480.0, 0.1, 100.0);

		loadIdentity();
		mvTranslate([-0.0, 0.0, -6.0]);

		gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
		gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
		setMatrixUniforms();
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

*绘制中用到了其它工具函数*，请参照MDN。


###结束

这篇文章是WebGL自学的第一篇文章，仅仅简单介绍WebGL的基本使用，之后会有更多。

**补充：**因为MDN教程还是失之简单，一些地方并没有讲清楚，比如没有指出工具函数需要引入`glUtils.js`和`sylvester.js`两个文件才能正常工作；比如没有解释`setMatrixUniforms()`等函数功能是什么等等。现已换到另一套教程。。。