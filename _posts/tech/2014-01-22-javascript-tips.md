---
layout: default
title: MySQL安装与基本命令
category: tech
tags: mysql
extraCss: [/css/md.css, /css/github.css]
extraJs: [/js/page/hight.js]
description: <p>mysql数据库的安装配置，一些基本命令的使用。</p>
---

###MySQL

大学时学过一门数据库的课程，主要是SQL Server，那时也就是会基本的增删改查命令，对表、视图有个基本的了解。只是对SQL Server的学习到写了个电子图书馆的Demo就结束了。

毕业后，学习Nodejs时接触到了MongoDB，当时对这种非关系型数据库惊为天人，觉得用json对象来描述一条记录对程序员太友好了，直观易于理解。

然后现在，因为工作的原因，要学习MySQL数据库，这篇文章算是对MySQL学习的开端，主要就是MySQL的安装、配置，命令行下基本命令的使用。

####MySQL简介

MySQL是一个关系型数据库管理系统，由瑞典MySQL AB公司开发，目前属于Oracle公司。

MySQL所使用的SQL语言是用于访问数据库的最常用标准化语言。MySQL软件采用了双授权政策，它分为社区版和商业版，由于其体积小、速度快、总体拥有成本低，尤其是开放源码这一特点，一般中小型网站的开发都选择MySQL作为网站数据库。由于其社区版的性能卓越，搭配PHP和Apache可组成良好的开发环境。

###MySQL安装

本文安装是在win7 64位系统下，安装的是非安装版的MySQL社区版。

####下载

作为开发学习用，我们采用MySQL的社区版，首先我们去官网下载。网址是<http://dev.mysql.com/downloads/mysql/>。

下载压缩包版 `mysql5.6.16win64.zip` （32位可下载对应压缩包），解压后，目录结构是

	mysql5.6.16win64
		|--bin  (MySQL提供的各种命令)
			|--mysqld.exe  ()
			|--mysql.exe
			...
		|--data  (数据存储的位置)
		|--docs  (文档)
		...
		|--lib  (库文件)
		...
		|--my-dafault.ini
		|--README

####安装

1.	解压下载的压缩包，假设解压在e盘，即有 `e:\mysql5.6.16win64` 目录。

2.	以管理员身份运行cmd（命令行），进入mysql5.6.16win64下的bin目录：

		e:
		cd mysql5.6.16win64\bin

3.	安装mysql服务：

		mysqld install mysql

4.	启动mysql服务：

		net start mysql

5.	停止mysql服务：

		net stop mysql

6.	卸载mysql服务：

		mysqld remove mysql
		或者直接
		mysql remove

#####安装的具体说明与问题解决

1.	管理员权限

	必须以管理员权限运行cmd，否则执行安装服务时会出现

		Install/Remove of the Service Denied!

	这说明你没有权限来执行命令。

2.	my.ini配置

	网上关于这方面的教程一大堆，但可惜的是大部分教程已经陈旧。mysql压缩包中已经不存在my-small.ini等各种可选配置文件，配置选项也有变化。按照网上教程的来做，执行

		mysqld install mysql --default-file="e:\mysql5.6.16win64\my.ini"

	安装基本能成功，但启动服务时，就会出现 **1067** 错误。

	这个命令中default-file指定的是初始化文件，my.ini中可以进行各种配置。但1067的错误始终会有。如果使用压缩包中的my-default.ini则可以避免1067错误。

###MySQL基本命令

安装完后，启动了mysql服务，就可以使用mysql数据库了。

1.	以root用户登陆mysql。

		mysql -uroot -p***

	其中root是用户名，***是密码。记住，默认密码为空，所以第一次应该是以

		mysql -uroot -p

	就可以登陆。

2.	默认情况下密码为空，这不安全，那怎么修改密码？同样输入

		mysql -uroot -p***

	其中***为你的新密码。这时候，mysql会要求你输入原密码，输入后回车，即完成密码修改。

3.	查看数据库和表。

	登陆mysql后，可使用`show databases`查看所有的数据库。

	另外，通过 `use test`即可以指定当前数据库，其中test为数据库名。

	在`use`后，即可以通过`show tables`查看当前数据库的所有表。

	然后使用`desc tableName;`即可查看指定表的结构。

4.	新建数据库和表。

		create database xxx;
		create table xxx;

5.	基本的增删改查。

	使用标准SQL语句来完成记录的增删改查，这里写一个查询命令：

		select name,age from user where id="B009";

	查询id是"B009"的用户的姓名和年龄。

关于MySQL的基本介绍就到这里。应该说mysql的安装到使用已经清晰了，而如何在程序中使用数据库（数据库编程）可在我的有关Java Web编程的文章中查看。