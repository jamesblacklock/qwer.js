$(function()
{
	Date.prototype.stdTimezoneOffset = function()
	{
	    var jan = new Date(this.getFullYear(), 0, 1);
	    var jul = new Date(this.getFullYear(), 6, 1);
	    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
	}
	
	Date.prototype.isDstObserved = function()
	{
	    return this.getTimezoneOffset() < this.stdTimezoneOffset();
	}
	
	$.qwer = function(e, bind)
	{
		if(e instanceof $)
			return e;
		else if(e instanceof Node)
			return $(e);
		else if(e == null)
			return $();
		else if(typeof e == 'function')
			return $.qwer(bind ? e.call(bind) : e(), bind);
		else if(typeof e.valueOf() != 'object')
			return $.qwer($.parseHTML( String(e.valueOf()) ));
		else if(e[Symbol.iterator])
		{
			let a = $();
			for(let q of e)
				a = a.add( $.qwer(q, bind) );
			
			return a;
		}
		else
			return $.qwer(e.html, e);
	};
	
	$.qwerEq = function(l, r, strict, maxDepth)
	{
		if(maxDepth == 0)
			return false;
		
		if(l == null || r == null)
			return strict ? l === r : l == r;
		
		l = l.valueOf();
		r = r.valueOf();
		
		if( !strict && ((l.constructor == Number && r.constructor == String) || 
		(r.constructor == Number && l.constructor == String)) )
			[l, r] = [String(l), String(r)];
		
		if(typeof l != 'object')
			return l === r || ( l.constructor == Number && r.constructor == Number && isNaN(l) && isNaN(r) );
		
		let keys = new Set([...Object.keys(l), ...Object.keys(r)]);
		
		for(let key of keys)
		{
			if( !$.qwerEq(l[key], r[key], strict, maxDepth-1) )
				return false;
		}
		
		return true;
	};
	
	$.fn.checked = function(val)
	{
		if(val === undefined)
			return this[0].checked;
		else
			return this.each( (i, e) => e.checked = (val != null && String(val) != 'false') );
	};
	
	$.fn.findFocusable = function(val)
	{
		return this.find('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
	};
	
	$.fn.qwerChange = function(f, ms)
	{
		if(f == null)
			f = e => e.type != 'change' && this.change();
		
		this.on('keydown keyup keypress cut paste change', e => 
		{
			ms = ms == null ? 150 : Number(ms);
			let key = `qwerChange${ms}`;
			let timeout = $(e.target).data(key);
			clearTimeout(timeout);
			timeout = setTimeout( () => 
			{
				let lastVal = $(e.target).data('lastVal');
				let val     = $(e.target).val();
				$(e.target).data('lastVal', val);
				
				if(val !== lastVal)
					f(e);
			}, ms);
			$(e.target).data(key, timeout);
		});
		
		return this;
	};
	
	const NUMBER_REGEX = /^-?(\d+(\.\d+)?|\.\d+|)$/;
	
	class QwerFormControl
	{
		constructor(target, options, parent)
		{
			this.eventHandlers = { change: { event: 'change', handler: this.onChange, block: 1 } };
			
			if( options.form && !(this instanceof QwerForm) )
				return new QwerForm(target, options, parent);
			else if( options.array && !(this instanceof QwerFormArray) )
				return new QwerFormArray(target, options, parent);
			
			this.parent = parent;
			this.target = target;
			this.options = options;
			this.name = this.options.name || this.options.form || this.options.array;
			
			if(this.options.init)
				this.options.init.call(this);
			
			if(this.options.qwerSelect)
				this.target.qwerSelect(this.options.qwerSelect == true ? {} : this.options.qwerSelect);
			
			let isCheckbox   = this.target.is('input[type=checkbox]');
			let isQwerSelect = !!this.target.data('qwerSelect');
			let isSelect     = this.target.is('select');
			let isInput      = !isCheckbox && this.target.is('input:not([type=submit])');
			
			if(isQwerSelect)
			{
				this.qwerSelect = this.target.data('qwerSelect');
				this.options.onChange = 
					(function(otherOnChange, e)
					{
						if(this.qwerSelect == null)
							return;
						
						let [toAdd, toRemove] = this.valid ? ['valid', 'invalid'] : ['invalid', 'valid'];
						this.qwerSelect.addClass(toAdd);
						this.qwerSelect.removeClass(toRemove);
						
						otherOnChange && otherOnChange.call(this, e);
					})
					.bind(this, this.options.onChange);
			}
			
			if(this.options.getValue == null)
			{
				if(isCheckbox)
				{
					this.options.getValue = function() { return this.target.checked(); };
				}
				else if(isQwerSelect)
				{
					this.options.getValue = function()  { return this.qwerSelect && this.qwerSelect.value; };
				}
				else if(isSelect)
				{
					this.options.getValue = function() { return this.target.val(); };
				}
				else if(isInput)
				{
					this.options.getValue = function()
					{
						let val = this.target.val().trim();
						
						if(this.options.number)
						{
							this._rawValue = val;
							val = val && NUMBER_REGEX.test(val) ? Number(val) : null;
						}
						
						return val;
					};
				}
				else
				{
					this.options.getValue = function() { return this._value; };
				}
			}
			
			if(this.options.setValue == null)
			{
				if(isCheckbox)
				{
					this.options.setValue = function(val) { this.target.checked(!!val); return this.target.checked(); };
				}
				else if(isQwerSelect)
				{
					this.options.setValue = function(val) { this.qwerSelect && this.qwerSelect.setValue(val); };
				}
				else if(isSelect || isInput)
				{
					this.options.setValue = function(val) { this.target.val(val == null ? '' : val); return this.target.val(); };
				}
				else
				{
					this.options.setValue = function(val) {};
				}
			}
			
			if(this.options.value === undefined)
			{
				if(isCheckbox)
				{
					this.options.value = false;
				}
				else if(isSelect || isInput)
				{
					this.options.value = '';
				}
				else if( !this instanceof QwerForm )
				{
					this.options.value = null;
				}
			}
			
			if(isInput)
				this.target.qwerChange();
			
			let methods = Object.keys(this.options)
				.filter( e => this.options[e] && this.options[e].constructor == Function )
				.map(    e => ({ name: e, method: this.options[e].bind(this) }) );
			
			this.method = {};
			for(let m of methods)
				this.method[m.name] = m.method;
			
			let data = Object.keys(this.options)
				.filter( e => this.options[e] == null || this.options[e].constructor != Function )
				.map(    e => ({ name: e, data: this.options[e] }) );
			
			this.data = {};
			for(let d of data)
				this.data[d.name] = d.data;
			
			this.changeCounter = 0;
			
			let handlers = Object.keys(this.options)
				.filter( e => e.toLowerCase() != 'onchange' )
				.filter( e => /^on[A-Za-z]+$/.test(e) )
				.map(    e => ({ event: e.slice(2).toLowerCase(), handler: this.options[e], block: 0 }) );
			
			handlers.push(this.eventHandlers['change']);
			
			for(let e of handlers)
			{
				this.eventHandlers[e.event] = e;
				this.target.on( e.event, this.handleEvent.bind(this, e.event) );
			}
			
			this.setVisible(this.options.visible);
			this.setDisabled(!!this.options.disabled);
			
			this.eventHandlers.change.block--;
			
			this.target.data('qwerFormControl', this);
		}
		
		setVisible(set)
		{
			if(set == null)
				set = true;
			
			if(this.visible == !!set)
				return;
			
			this.visible = !!set;
			
			let targets = this.target
				.add( this.target.closest(`[forName="${this.name}"]`) )
				.add( this.target.siblings(`[forName="${this.name}"]`) )
				.add( this.qwerSelect && this.qwerSelect.element );
			
			if(this.visible)
			{
				targets.removeClass('qwerHiddenFormControl');
				this.target.trigger('qwerFormControl.show');
			}
			else
			{
				targets.addClass('qwerHiddenFormControl');
				this.target.trigger('qwerFormControl.hide');
			}
			
			this.triggerChange();
		}
		
		setDisabled(set)
		{
			if(set == null)
				set = true;
			
			if(this.disabled == !!set)
				return;
			
			this.disabled = !!set;
			
			if(this.disabled)
			{
				this.target
					.addClass('qwerDisabledFormControl')
					.attr('disabled', '');
			}
			else
			{
				this.target
					.removeClass('qwerDisabledFormControl')
					.removeAttr('disabled');
			}
		}
		
		handleEvent(type, e)
		{
			function callHandler(source, target, type, e)
			{
				let eventHandler = target.eventHandlers[type];
				let allEventsHandler = target.eventHandlers['event'];
				let handled = false;
				
				if(eventHandler && !eventHandler.block)
				{
					eventHandler.block++;
					eventHandler.handler.call(target, e, source);
					eventHandler.block--;
					
					handled = true;
				}
				
				if(allEventsHandler && !allEventsHandler[`block${type}`])
				{
					allEventsHandler[`block${type}`] = allEventsHandler[`block${type}`] == null ? 1 : allEventsHandler[`block${type}`]+1;
					allEventsHandler.handler.call(target, e, source);
					allEventsHandler[`block${type}`] = false;
					
					handled = true;
				}
				
				return handled;
			}
			
			if(e.result != this)
			{
				let ctl = this;
				while(ctl != null)
				{
					if(callHandler(this, ctl, type, e) == false)
						break;
					
					ctl = ctl.parent;
				}
			}
			
			return this.parent;
		}
		
		triggerChange()
		{
			let c = this.changeCounter;
			
			if(this.target.length > 0)
				this.target.change();
			
			if(c == this.changeCounter)
				this.handleEvent( 'change', new CustomEvent('change') );
		}
		
		onChange(e, control)
		{
			this.changeCounter++;
			
			let val = this.options.getValue.call(this);
			
			if(this.options.transformOutput)
				val = this.options.transformOutput.call(this, val);
			
			this.previousValue = this._value;
			this._value = val;
			this.validate();
			
			if(this.options.onChange)
				this.options.onChange.call(this, e, control);
		}
		
		get valid()
		{
			return !!this._valid;
		}
		
		validate()
		{
			this._valid = true;
			
			if(this.options.required)
				this._valid = this._valid && this._value != null && this._value !== '' && 
				 ((this.qwerSelect && this.qwerSelect.options.multiSelect) ? this._value.length > 0 : true);
			
			if(this.options.number)
			{
				this._valid = this._valid && NUMBER_REGEX.test(this._rawValue);
				
				if(this.options.minValue)
					this._valid = this._valid && Number(this._rawValue) >= this.options.minValue;
				if(this.options.maxValue)
					this._valid = this._valid && Number(this._rawValue) <= this.options.maxValue;
			}
			
			if(this.options.regex)
				this._valid = this._valid && this.options.regex.test(this._value);
			
			if(this.options.validate)
				this._valid = this.options.validate.call(this) && this._valid;
			
			if(this._valid)
			{
				this.target.addClass('valid');
				this.target.removeClass('invalid');
			}
			else
			{
				this.target.removeClass('valid');
				this.target.addClass('invalid');
			}
			
			return this._valid;
		}
		
		findParent(name)
		{
			let p = this.parent;
			while(p != null)
			{
				if(p.name == name)
					return p;
				p = p.parent;
			}
		}
		
		get siblings()
		{
			return (this.parent && this.parent.controls) || {};
		}
		
		get value()
		{
			return this._value;
		}
		
		setValue(val, force)
		{
			if(val === undefined)
				val = this.options.value;
			
			if(val != null && val.constructor == Function)
				val = val();
				
			if( !force && $.qwerEq(val, this.value, false, 2) )
				return;
			
			if(this.options.transformInput)
				val = this.options.transformInput.call(this, val);
			
			this.eventHandlers.change.block++;
			let result = this.options.setValue.call(this, val);
			if(result !== undefined)
				val = result;
			
			this._value = val;

			this.eventHandlers.change.block--;
			this.triggerChange();
		}
		
		getChildTarget(options)
		{
			if(options.target === null)
			{
				return $();
			}
			else if(options.target)
			{
				return $.qwer(options.target);
			}
			else
			{
				if(options.selector == null)
					options.selector = `[name="${options.name||options.form||options.array}"]`;
				
				return this.target.find(options.selector);
			}
		}
	}
	
	class QwerFormArray extends QwerFormControl
	{
		constructor(target, options, parent)
		{
			if(options.validate == null)
				options.validate = function() { return this.validateArray(); }
			
			if(options.getValue == null)
				options.getValue = function() { return this.getArrayValue(); }
			
			if(options.setValue == null)
				options.setValue = function(val) { return this.setArrayValue(val); }
			
			super(target, options, parent);
			
			this.controls = [];
			this.triggerChange();
			
			this.target.data('qwerFormArray', this);
		}
		
		addItem(item)
		{
			let ctl = this.options.addItem.call(this, item);
			let element = this.getChildTarget(ctl);
			
			this.eventHandlers.change.block++;
			ctl = new QwerFormControl(element, ctl, this);
			this.controls.push(ctl);
			ctl.setValue(item, true);
			
			this.eventHandlers.change.block--;
			this.triggerChange();
		}
		
		removeControl(control)
		{
			let index = this.controls.findIndex(e => e == control);
			
			if(index < 0)
				return;
			
			this.controls.splice(index, 1);
			this.options.controlRemoved(control);
			this.triggerChange();
		}
		
		validateArray()
		{
			let valid = true;
			
			for(let ctl of this.controls)
			{
				if(ctl.visible)
					valid = ctl.validate() && valid;
			}
			
			return valid;
		}
		
		getArrayValue()
		{
			let val = [];
			for(let ctl of this.controls)
			{
				if(ctl.visible && !ctl.options.ignoreValue && ctl.value !== undefined)
					val.push(ctl.value);
			}
			
			return val;
		}
		
		setArrayValue(val)
		{
			while(this.controls.length > 0)
				this.removeControl(this.controls[0]);
			
			if(val == null)
				return [];
			
			if(val.constructor != Array)
				val = [val];
			
			for(let item of val)
				this.addItem(item);
			
			return this.getArrayValue();
		}
	}
	
	class QwerForm extends QwerFormControl
	{
		constructor(target, options, parent)
		{
			if(options.validate == null)
				options.validate = function() { return this.validateForm(); }
			
			if(options.getValue == null)
				options.getValue = function() { return this.getFormValue(); }
			
			if(options.setValue == null)
				options.setValue = function(val) { return this.setFormValue(val); }
			
			super(target, options, parent);
			
			this.eventHandlers.change.block++;
			
			this.controls = {};
			if(this.options.controls)
			{
				for(let ctl of this.options.controls)
				{
					let element = this.getChildTarget(ctl);
					ctl = new QwerFormControl(element, ctl, this);
					this.controls[ctl.name] = ctl;
				}
			}
			
			for(name in this.controls)
				this.controls[name].setValue(undefined, true);
			
			this.eventHandlers.change.block--;
			
			this.triggerChange();
			
			this.target.data('qwerForm', this);
		}
		
		validateForm()
		{
			let valid = true;
			
			for(name in this.controls)
			{
				let ctl = this.controls[name];
				if(ctl.visible && !ctl.valid && !ctl.options.ignoreValue)
					return false;
			}
			
			return true;
		}
		
		getFormValue()
		{
			let val = {};
			for(name in this.controls)
			{
				let ctl = this.controls[name];
				if(ctl.visible && !ctl.options.ignoreValue && ctl.value !== undefined)
					val[name] = ctl.value;
			}
			
			return val;
		}
		
		setFormValue(val)
		{
			for(name in this.controls)
				this.controls[name].setValue(val && val[name]);
			
			return this.getFormValue();
		}
	}
	
	class QwerPanel
	{
		constructor(target, options, name)
		{
			this.target = target;
			this.options = options || {};
			this.name = name || (this.options.name);
			this.options.name = this.name;
			this.panel = $('<div class="qwerPanel"></div');
			this.titleBar = $('<div class="titleBar"></div>').appendTo(this.panel);
			this.titleBar.mousedown( e => this.mouseDown(e) );
			this.icon = $('<div class="icon"></div>').appendTo(this.titleBar);
			this.title = $('<div class="title"></div>').appendTo(this.titleBar);
			
			this.caretIcon = $('<i class="fas fa-caret-up"></i>');
			$('<button class="rollup"></button>')
				.append(this.caretIcon)
				.appendTo(this.titleBar)
				.click( e => this.setCollapsed(!this.collapsed) );
			
			$('<button class="help"><i class="fas fa-question-circle"></i></button>')
				.appendTo(this.titleBar);
			
			$('<button class="close"><i class="fas fa-times"></i></button>')
				.appendTo(this.titleBar)
				.click( e => this.setVisible(false) );
			
			this.content = $('<div class="content" style="flex:1"></div>').appendTo(this.panel);
			
			if(this.options.allowResize)
			{
				let n  = $(`<div class="resize n  "></div>`).mousedown( e => this.resizeMouseDown(e.clientX, e.clientY,  0, -1, e) );
				let e  = $(`<div class="resize e  "></div>`).mousedown( e => this.resizeMouseDown(e.clientX, e.clientY,  1,  0, e) );
				let s  = $(`<div class="resize s  "></div>`).mousedown( e => this.resizeMouseDown(e.clientX, e.clientY,  0,  1, e) );
				let w  = $(`<div class="resize w  "></div>`).mousedown( e => this.resizeMouseDown(e.clientX, e.clientY, -1,  0, e) );
				let nw = $(`<div class="resize n w"></div>`).mousedown( e => this.resizeMouseDown(e.clientX, e.clientY, -1, -1, e) );
				let ne = $(`<div class="resize n e"></div>`).mousedown( e => this.resizeMouseDown(e.clientX, e.clientY,  1, -1, e) );
				let se = $(`<div class="resize s e"></div>`).mousedown( e => this.resizeMouseDown(e.clientX, e.clientY,  1,  1, e) );
				let sw = $(`<div class="resize s w"></div>`).mousedown( e => this.resizeMouseDown(e.clientX, e.clientY, -1,  1, e) );
				
				this.panel.append(n,e,s,w,nw,ne,se,sw);
			}
			
			this.target.data(`qwerPanel${this.name ? `.${this.name}` : ''}`, this);
			
			this.setOptions(options);
		}
		
		setOptions(options)
		{
			this.options = options || this.options;
			
			if(this.options.modal || this.options.fixedModal)
				this.base = $(`<div class="qwerModal ${this.options.fixedModal ? 'fixed' : ''}"></div>`).append( this.panel.detach() );
			else
				this.base = this.panel.detach();
			
			this.setVisible(this.options.visible, true);
			delete this.options.visible;
			
			this.setCollapsed(!!this.options.collapsed, true);
			delete this.options.collapsed;
			
			if(this.options.minWidth)
				this.content.css('min-width', this.options.minWidth);
			if(this.options.minHeight)
				this.content.css('min-height', this.options.minHeight);
			
			this.setPosition({left: 10, top: 10});
			this.restorePosition();
			
			this.title.text(this.options.title);
			this.icon.empty().append(`<i class="fas fa-${this.options.iconName}"></i>`);
		}
		
		setTitle(title)
		{
			this.options.title = title;
			this.title.text(this.options.title);
		}
		
		setVisible(set, force)
		{
			if(set == null)
				set = true;
			
			if(this.visible == !!set && !force)
				return;
			
			this.visible = !!set;
			this.setCollapsed(false);
			
			if(this.visible)
			{
				this.content.children().detach();
				this.content.append( $.qwer(this.options.content) );
				
				this.base.appendTo(this.target);
				this.content.findFocusable().first().focus();
				
				this.target.trigger('qwerPanel.show');
			}
			else
			{
				this.base.detach();
				
				this.target.trigger('qwerPanel.hide');
			}
		}
		
		setCollapsed(set, force)
		{
			if(set == null)
				set = true;
			
			if(this.collapsed == !!set && !force)
				return;
			
			this.collapsed = !!set;
			
			this.caretIcon.addClass(this.collapsed ? 'fa-caret-down' : 'fa-caret-up');
			this.caretIcon.removeClass(!this.collapsed ? 'fa-caret-down' : 'fa-caret-up');
			
			if(this.collapsed)
				this.panel.addClass('collapsed');
			else
				this.panel.removeClass('collapsed');
		}
		
		mouseDown(e)
		{
			if(this.options.fixedModal)
				return;
			
			$(document).one( 'mouseup', e => this.mouseUp(e) );
			
			let x = this.panel.position().left;
			let y = this.panel.position().top;
			this.mouseMoveHandler = this.mouseMove.bind(this, x, y, e.screenX, e.screenY);
			$(document).mousemove(this.mouseMoveHandler);
		}
		
		mouseUp(e)
		{
			$(document).off('mousemove', this.mouseMoveHandler);
			this.content.removeClass('dragging');
			$(document.body).removeClass('qwerPanelDragging');
			this.dragging = false;
		}
		
		mouseMove(x, y, x_, y_, e)
		{
			e.preventDefault();
			
			if(!this.dragging)
			{
				if(Math.sqrt(Math.pow(e.screenX-x_,2) + Math.pow(e.screenY-y_,2)) < 4)
					return;
				
				this.dragging = true;
				this.content.addClass('dragging');
				$(document.body).addClass('qwerPanelDragging');
			}
			
			let clampX = Math.max(0, x+e.screenX-x_);
			clampX = Math.min( clampX, this.panel.parent().outerWidth()-this.titleBar.outerWidth() );
			
			let clampY = Math.max(0, y+e.screenY-y_);
			clampY = Math.min( clampY, this.panel.parent().outerHeight()-this.titleBar.outerHeight() );
			
			this.panel.css('left', clampX);
			this.panel.css('top', clampY);
			
			this.savePosition();
		}
		
		resizeMouseDown(xClick, yClick, xFactor, yFactor, e)
		{
			e.preventDefault();
			
			this.resizingHandler = this.resizeMouseMove.bind(
				this, xClick, yClick, xFactor, yFactor, 
				this.panel.position().left, this.panel.position().top, 
				this.content.outerWidth(), this.content.outerHeight());
			
			$(document).mousemove(this.resizingHandler);
			$(document).one( 'mouseup', e => $(document).off('mousemove', this.resizingHandler) );
		}
		
		resizeMouseMove(xClick, yClick, xFactor, yFactor, fromX, fromY, fromW, fromH, e)
		{
			e.preventDefault();
			
			let wChange = (e.clientX-xClick) * xFactor;
			let hChange = (e.clientY-yClick) * yFactor;
			let w = fromW + wChange;
			let h = fromH + hChange;
			let x = fromX - wChange;
			let y = fromY - hChange;
			
			this.content.css({ width: w, height: h });
			
			if(xFactor < 0)
				this.panel.css( 'left', fromX+fromW-this.panel.outerWidth() );
			if(yFactor < 0)
				this.panel.css( 'top', fromY+fromH-this.panel.outerHeight()+this.titleBar.outerHeight() );
		}
		
		savePosition()
		{
			if(this.name == null)
				return;
			
			clearTimeout(this.saveTimeout);
			this.saveTimeout = setTimeout( () => 
			{
				let {left, top} = this.panel.position();
				document.cookie = `qwerPanel.${this.name}.x=${left}`;
				document.cookie = `qwerPanel.${this.name}.y=${top}`;
			}, 300);
		}
		
		restorePosition()
		{
			if(this.name == null)
				return;

			let xMatch = new RegExp(`(?:^|; *)qwerPanel\\.${this.name}\\.x=(\\d+)(?:;|$)`).exec(document.cookie);
			let yMatch = new RegExp(`(?:^|; *)qwerPanel\\.${this.name}\\.y=(\\d+)(?:;|$)`).exec(document.cookie);
			
			this.setPosition({ left: xMatch && xMatch[1], top: yMatch && yMatch[1] });
		}
		
		setPosition({left, top})
		{
			if(left != null)
				this.panel.css('left', Number(left) );
			if(top != null)
				this.panel.css('top',  Number(top) );
		}
	}
	
	class QwerTreeItem
	{
		constructor(target, options, depth)
		{
			this.target   = target;
			this.options  = options;
			this.expanded = !!this.options.expanded;
			this.depth    = depth || 0; 
			
			let depthSpacer = $('<span class="qwerTreeDepthSpacer">').css('width', `${this.depth*1.5}em`);
			this.control = $('<span class="qwerTreeExpander empty fas fa-caret-right"></span>');
			this.target
				.prepend(this.control)
				.prepend(depthSpacer);
			
			this.control.click( e => this.setExpanded(!this.expanded) );
			
			this.children = [];
			this.updateChildren();
			
			this.target.data('qwerTreeItem', this);
		}
		
		updateChildren()
		{
			if(this.options.getChildren == null)
				return;
			
			let result = this.options.getChildren.call(this.options.item);
			
			if( !(result instanceof Promise) )
				result = Promise.resolve(result);
			
			result.then( children => 
			{
				this.children = children;
				
				if(this.children == null)
					this.children = [];
				
				if(this.children.length > 0)
					this.control.removeClass('empty');
				else
					this.control.addClass('empty');
				
				for(let child of this.children)
					child.element = $.qwer(child);
			});
		}
		
		addChild(child)
		{
			child.element = $.qwer(child);
			if(this.expanded)
			{
				new QwerTreeItem(child.element, child, this.depth+1);
				child.populated = true;
				child.element.insertAfter(this.children.length == 0 ? this.target : this.children[this.children.length-1].element);
			}
			
			this.control.removeClass('empty');
			this.children.push(child);
		}
		
		removeChildren(f)
		{
			let toRemove  = this.children.filter( e =>  f(e) );
			this.children = this.children.filter( e => !f(e) );
			
			if(this.expanded)
			{
				for(let child of toRemove)
					child.element.detach();
			}
		}
		
		setVisible(set, after)
		{
			if(set)
				this.target.insertAfter(after);
			else
				this.target.detach();
			
			if(this.expanded)
			{
				for( let treeItem of this.children.map(e => e.qwerTreeItem).reverse() )
					treeItem.setVisible(set, this.target);
			}
		}
		
		setExpanded(set)
		{
			if(set == null)
				set = true;
			
			if(this.expanded == !!set)
				return;
			
			this.expanded = !!set;
			
			if(this.expanded)
			{
				this.control.addClass('expanded');
				
				for(let child of this.children)
				{
					if(!child.qwerTreeItem)
						child.qwerTreeItem = new QwerTreeItem(child.element, child, this.depth+1);
				}
				
				for( let treeItem of this.children.map(e => e.qwerTreeItem).reverse() )
					treeItem.setVisible(true, this.target);
			}
			else
			{
				this.control.removeClass('expanded');
				
				for(let child of this.children)
					child.qwerTreeItem.setVisible(false, this.target);
			}
		}
	}
	
	class QwerFlyout
	{
		constructor(target, options)
		{
			this.anchorPoint = $('<div class="qwerAnchorPoint"></div>');
			
			this.target = target
				.mousedown( e => this.mouseDown(e) );
			
			this.target[0].tabIndex = 0;
			
			this.flyout = $('<div class="qwerFlyout"></div')
				.appendTo(this.anchorPoint)
				.mousedown( e => this.mouseDown(e) );
			
			this.setOptions(options);
			
			this.visible = false;
			
			if(!this.options.externallyControlled)
				this.target.click( e => this.setVisible(!this.visible) )
			
			this.target.data('qwerFlyout', this);
		}
		
		setOptions(options)
		{
			this.options = options;
			
			if(this.content)
				this.content.detach();
			
			if(this.options != null)
			{
				this.content = $.qwer(this.options);
				this.flyout.append(this.content);
			}
			
			requestAnimationFrame( () => this.updatePositioning() );
		}
		
		updatePositioning()
		{
			if(!this.visible)
				return;
			
			let anchorProps = { left: this.target.offset().left, top: this.target.offset().top + this.target.outerHeight() };
			let flyoutProps   = { /*width: '', maxWidth: '',*/ minWidth: '', maxHeight: '' };
			
			this.anchorPoint.css(anchorProps);
			this.flyout.css(flyoutProps);
			
			if(this.options.matchWidth)
			{
				flyoutProps.minWidth = this.target.outerWidth();
				//flyoutProps.width = this.target.outerWidth();
				//flyoutProps.maxWidth = flyoutProps.width;
				//flyoutProps.minWidth = flyoutProps.width;
			}
			
			if(this.options.preferRight)
				anchorProps.left += this.target.outerWidth() - this.flyout.outerWidth();
			
			let margin = 4;
			
			if(anchorProps.left < margin)
				anchorProps.left = margin;
			else if(anchorProps.left + this.flyout.outerWidth() > window.innerWidth - margin)
				anchorProps.left = window.innerWidth - this.flyout.outerWidth() - margin;
			
			if(this.options.preferTop)
				anchorProps.top += -this.flyout.outerHeight() - this.target.outerHeight();
			
			if( this.options.noCover && (anchorProps.top < margin || anchorProps.top + this.flyout.outerHeight() > window.innerHeight - margin) )
			{
				let useTop = this.target.offset().top > window.innerHeight - this.target.offset().top - this.target.outerHeight() - margin;
				
				if(useTop)
				{
					anchorProps.top = Math.max(this.target.offset().top - this.flyout.outerHeight(), margin);
					flyoutProps.maxHeight = this.target.offset().top - margin;
				}
				else
				{
					anchorProps.top = this.target.offset().top + this.target.outerHeight();
					flyoutProps.maxHeight = window.innerHeight - anchorProps.top;
				}
			}
			else if(anchorProps.top < margin)
			{
				anchorProps.top = margin;
			}
			else if(anchorProps.top + this.flyout.outerHeight() > window.innerHeight - margin)
			{
				anchorProps.top = window.innerHeight - this.flyout.outerHeight() - margin;
			}
			
			this.anchorPoint.css(anchorProps);
			this.flyout.css(flyoutProps);
		}
		
		setVisible(set)
		{
			if(set == null)
				set = true;
			
			if(this.visible == !!set)
				return;
			
			this.visible = !!set;
			
			if(this.visible)
			{
				this.target.addClass('qwerFlyoutVisible');
				this.anchorPoint.appendTo(document.body);
				
				requestAnimationFrame( () => this.updatePositioning() );
				requestAnimationFrame( () => $(document).one('mousedown', e => this.documentMouseDown(e)) );
				
				this.windowResizeHandler = this.updatePositioning.bind(this);
				$(window).on('resize', this.windowResizeHandler)

				requestAnimationFrame( () => this.target.trigger('qwerFlyout.show') );
			}
			else
			{
				this.target.removeClass('qwerFlyoutVisible');
				this.anchorPoint.detach();
				
				if(this.windowResizeHandler)
					$(window).off('resize', this.windowResizeHandler)
				
				requestAnimationFrame( () => this.target.trigger('qwerFlyout.hide') );
			}
		}
		
		documentMouseDown()
		{
			if(!this.mouseIsDown)
				this.setVisible(false);
			else
				$(document).one( 'mousedown', e => this.documentMouseDown(e) );
		}
		
		mouseDown()
		{
			this.mouseIsDown = true;
			$(document).one('mouseup', e => requestAnimationFrame(() => this.mouseIsDown = false) );
		}
	}
	
	class QwerMenu extends QwerFlyout
	{
		constructor(target, options)
		{
			if(options && options.constructor == Array)
				options = { items: options };
			
			super(target, options);
			
			this.menu = this.flyout
				.addClass('qwerMenu')
				.mousemove( e => this.setPreselectedIndex(null) );
			
			this.menuInitReady = true;
			this.setOptions(options);
			
			this.target
				.data('qwerMenu', this)
				.keydown( e => this.keyDown(e) );
		}
		
		keyDown(e)
		{
			if(this.visible)
			{
				if(e.key == 'ArrowDown' || e.key == 'ArrowUp')
				{
					e.preventDefault();
					let i = this.preselectedIndex;
					
					do
					{
						if(e.key == 'ArrowDown')
							i = (i == null ? 0 : i+1) % this.items.length;
						else
							i = (i == null || i == 0) ? this.items.length-1 : i-1;
					}
					while( i != this.preselectedIndex && (this.items[i].separator || this.items[i].disabled) );
					
					this.setPreselectedIndex(i);
				}
				else if(e.key == 'Enter' && this.preselectedIndex != null)
				{
					e.preventDefault();
					this.selectItem(this.items[this.preselectedIndex]);
				}
				else if(e.key == 'Escape')
				{
					e.preventDefault();
					this.setVisible(false);
					this.target.focus();
				}
			}
			else if(e.key == ' ')
			{
				e.preventDefault();
				this.setVisible();
			}
		}
		
		setPreselectedIndex(i)
		{
			this.menu.children('.preselected').removeClass('preselected');
			
			let item = this.items[this.preselectedIndex = i];
			
			if(item == null || item.disabled)
				return;
			
			let e = item.element.addClass('preselected');
			
			if( e.offset().top < this.menu.offset().top)
				e[0].scrollIntoView();
			else if( e.offset().top + e.outerHeight() > this.menu.offset().top + this.menu.outerHeight() )
				this.menu[0].scrollTop = this.menu[0].scrollTop + e.position().top + e.outerHeight() - this.menu.outerHeight();
		}
		
		selectItem(item)
		{
			if(item.disabled || item.separator)
				return;
			
			if(!item.noClose && !this.options.noClose)
				this.setVisible(false);
			
			if(item.onClick)
				item.onClick.call(this, item);
			
			this.target.focus();
		}
		
		setOptions(options)
		{
			if(this.menuInitReady != true)
			{
				super.setOptions(options);
				return;
			}
			
			this.options = options || {};
			
			if(this.options.constructor == Array)
				this.options = { items: this.options };
			
			this.updateItems();
		}
		
		updateItems()
		{
			let options = this.options;
			let items = options.items;
			
			while(typeof items == 'function')
				items = items();
			
			if( $.qwerEq(this.items, items) )
				return;
			
			this.menu.children().detach();
			this.items = items;
			
			for(let i=0; i<this.items.length; i++)
			{
				let item = this.items[i];
				if(typeof item.valueOf() != 'object')
					this.items[i] = item = { html: item };
				
				if(item.element == null)
				{
					let html = $.qwer(item);
					
					if(html.is('hr') || item.separator)
					{
						html = $('<hr>');
						item.separator = true;
					}
					else if(item.section)
					{
						html = $('<div class="menuSection"></div>').append(html);
						item.noClose = true;
					}
					else
					{
						html = $('<div class="menuItem"></div>').append(html);
					}
					
					if(item.disabled || html.attr('disabled') != null)
					{
						html.attr('disabled', '');
						item.disabled = true;
					}
					
					html.click( this.selectItem.bind(this, item) );
					
					item.element = html;
				}
				
				this.menu.append(item.element);
			}
			
			this.setPreselectedIndex(null);
			requestAnimationFrame( () => this.updatePositioning() );
		}
		
		setVisible(set)
		{
			if(set == null)
				set = true;
			
			if(this.visible == !!set)
				return;
			
			super.setVisible(set);
			
			this.setPreselectedIndex(null);
			
			if(this.visible)
			{
				if(this.items == null || typeof this.options.items == 'function')
					this.updateItems();
				
				this.target.addClass('qwerMenuVisible');
				requestAnimationFrame( () => this.target.trigger('qwerMenu.show') );
			}
			else
			{
				this.target.removeClass('qwerMenuVisible');
				requestAnimationFrame( () => this.target.trigger('qwerMenu.hide') );
			}
		}
	}
	
	class QwerSelect
	{
		constructor(target, options)
		{
			this.target = target;
			this.options = options || {};
			this.minWidth = 0;
			
			if(this.options.constructor == Array)
				this.options = { options: this.options };
			
			this._value = [];
			this.selectedOptions = [];
			
			this.box = $(`<div class="qwerSelect ${this.options.multiSelect ? 'multi' : ''}"></div>`)
				.insertAfter(this.target)
				.addClass( this.target.attr('class') )
				.attr( 'style', this.target.attr('style') );
			
			this.target.css( 'display', 'none', '!important' );
			
			let placeholderText = this.target.attr('placeholder');
			if(!placeholderText)
				placeholderText = this.target.find('option[value=""],option:not([value])').text();
			
			this.placeholder = $('<div class="placeholder" style="position:static"></div>').text(placeholderText);
			
			this.filter = $('<span></span>');
			
			if(this.options.filter)
			{
				this.filter = $('<input class="filter">')
					.focus( e => this.onFocus() )
					.blur( e => this.onBlur() )
					.click( e => this.menu.visible && e.stopPropagation() )
					.keydown( e => 
					{
						if( (e.key == ' ' && this.filter.val().trim() == '') || e.key == 'ArrowUp' || e.key == 'ArrowDown' )
							e.preventDefault();
						else if(e.key == 'Backspace' && this.filter.val() == '' && this.selectedOptions.length > 0)
							this.unselectOption(this.selectedOptions[this.selectedOptions.length-1]);
					})
					.qwerChange( () => this.filterChanged(), 0 );
				
				this.box.on( 'mousedown focus', e => this.filter.focus() );
			}
			
			let valueBox = $('<div class="valueBox"></div>')
				.append(this.filter);
			
			this.sizeBox = $('<div class="sizeBox"></div>')
				.append(this.placeholder)
				.append(valueBox);
			
			this.box
				.focus( e => this.onFocus() )
				.blur( e => this.onBlur() )
				.append(this.sizeBox)
				.append('<i class="fas fa-caret-down"></i>');
			
			if(this.options.getOptions == null)
				this.setOptions(this.options.options);
			
			this.menu = this.box
				.qwerMenu(
				{
					externallyControlled: true, 
					noClose: this.options.noClose,
					matchWidth: true, 
					noCover: !!this.options.filter, 
					items: this.getOptions.bind(this)
				})
				.prop('tabIndex', this.options.filter ? -1 : 0)
				.one( 'qwerMenu.show', e => this.placeholder.css('position', '') )
				//.on( 'qwerMenu.show', e => this.updateSize() )
				.on( 'qwerMenu.hide', e => this.hideFilter() )
				.data('qwerMenu');
			
			this.box.mousedown(e => e.which == 1 && this.menu.setVisible(!this.menu.visible) );
			
			this.target.data('qwerSelect', this);
		}
		
		onFocus()
		{
			this.box.addClass('filterFocused');
			this.sizeBox.css( 'minWidth', this.placeholder.outerWidth() );
			this.placeholder.css('position', '');
			this.updatePlaceholder();
		}
		
		onBlur()
		{
			if(this.menu.mouseIsDown)
				return;
			
			this.box.removeClass('filterFocused');
			this.menu.setVisible(false);
		}
		
		addClass(...args)
		{
			this.box.addClass(...args);
		}
		
		removeClass(...args)
		{
			this.box.removeClass(...args);
		}
		
		triggerChange()
		{
			this.target.change();
		}
		
		setOptions(options)
		{
			if(options)
			{
				this.predefinedOptions = options.map(e => typeof e == 'object' ? e : { html: e, value: e, text: String(e) });
			}
			else
			{
				this.predefinedOptions = Array.from( this.target.find('option') )
					.filter(e => !!e.value)
					.map( e => ({ html: $(e).text(), text: e.textContent, value: $(e).attr('value') }) );
			}
			
			this.options.getOptions = function(filter) 
			{
				if(filter)
					return this.predefinedOptions.filter( e => e.text.toLowerCase().includes(filter.toLowerCase()) );
				else
					return this.predefinedOptions;
			};
			
			this.options.getOptionForValue = function(value) { return this.predefinedOptions.find( e => $.qwerEq(value, e.value, false) ) };
			
			this.options.getOptions = this.options.getOptions.bind(this);
			this.options.getOptionForValue = this.options.getOptionForValue.bind(this);
		}
		
		getOptions()
		{
			this.minWidth = Math.max(this.placeholder.outerWidth(), this.minWidth);
			this.sizeBox.css('minWidth', this.minWidth);
			
			let options = this.options
				.getOptions( this.filter.val() ? this.filter.val() : undefined );
			
			if(!this.options.showSelectedInMenu)
				options = options.filter( e => !this._value.includes(e.value) );
			
			options = options.map( e => $.extend(e, { onClick: this.selectOption.bind(this, e) }) );
			
			if(options.length == 0)
				options.push({ disabled: true, html: '<i>No options available</i>' });
			
			return options;
		}
		
		selectOption(option, noTriggerChange)
		{
			if(option.value == null || option.value === '')
			{
				if(this.options.multiSelect)
					return;
				
				this.unselectOption(this.selectedOptions[0]);
			}
			else
			{
				if( option.exclusive || (this.selectedOptions.length == 1 && this.selectedOptions[0].exclusive) )
					this.setValue(null);
				
				option.selectElement = $.qwer(option);
				
				if(this.options.multiSelect)
				{
					this._value.push(option.value);
					this.selectedOptions.push(option);
					
					option.selectElement = $('<div class="multiSelectValue"></div>')
						.append(option.selectElement)
						.append( 
							$('<i class="unselect fas fa-times-circle"></i>')
							.mousedown( e => 
							{
								e.stopPropagation();
								e.preventDefault();
							})
							.click(e => 
							{
								e.stopPropagation();
								this.menu.setVisible(false);
							})
							.click(this.unselectOption.bind(this, option)) );
				}
				else
				{
					option.selectElement = $('<div class="singleSelectValue"></div>')
						.append(option.selectElement);
					
					this.unselectOption(this.selectedOptions[0], true);
					this._value = [option.value];
					this.selectedOptions = [option];
				}
				
				option.selectElement.insertBefore(this.filter);
			}
			
			if(noTriggerChange !== true)
			{
				this.updatePlaceholder();
				this.triggerChange();
				this.updateItems();
			}
		}
		
		unselectValue(value)
		{
			this.unselectOption( this.options.getOptionForValue(value) );
		}
		
		unselectOption(option, noTriggerChange)
		{
			if(option && option.constructor == Number)
				option = this.selectedOptions[option];
			
			if( option == null || !this.selectedOptions.includes(option) )
				return;
			
			option.selectElement.remove();
			this.selectedOptions = this.selectedOptions.filter(e => e != option);
			this._value = this._value.filter(e => e != option.value);
			
			if(this.selectedOptions.length == 0)
				this._value = [];
			
			if(noTriggerChange !== true)
			{
				this.updatePlaceholder();
				this.triggerChange();
				this.updateItems();
			}
		}
		
		updatePlaceholder()
		{
			if(this.filter.val() === '' && this.selectedOptions.length == 0)
				this.placeholder.css('display', '');
			else
				this.placeholder.css('display', 'none');
		}
		
		hideFilter()
		{
			this.filter.val('').change();
		}
		
		filterChanged()
		{
			if(this.filter.val().trim() == '')
				this.filter.val('');
			else
				this.menu.setVisible();
			
			this.updatePlaceholder();
			this.updateItems();
			this.menu.setPreselectedIndex(0);
		}
		
		setValue(value)
		{
			while(this.selectedOptions.length > 0)
				this.unselectOption(this.selectedOptions[0], true);
			
			if(value == null)
			{
				this.updatePlaceholder();
				this.triggerChange();
				return;
			}
			
			if(!this.options.multiSelect || value.constructor != Array)
				value = [value];
			
			for(let v of value)
			{
				let option = this.options.getOptionForValue(v);
				
				if(option != null)
					this.selectOption(option, true);
			}
			
			this.updatePlaceholder();
			this.triggerChange();
			this.updateItems();
		}
		
		updateItems()
		{
			this.menu.updateItems();
			//this.updateSize();
		}
		
		/*updateSize()
		{
			for(let item of this.menu.items || [])
				this.minWidth = Math.max(item.element && item.element.outerWidth(), this.minWidth);
			
			this.sizeBox.css('minWidth', this.minWidth);
		}*/
		
		get value()
		{
			return this.options.multiSelect ? this._value : (this._value[0] == null || this._value[0] === '') ? null : this._value[0];
		}
		
		get element()
		{
			return this.box;
		}
	}
	
	function createEach(c, Class, options, ...args)
	{
		function deepCopy(o, doIt)
		{
			return doIt === false ? o : $.extend(true, (o && o.constructor == Array) ? [] : {}, o);
		}
		
		for(let i=0; i<c.length; i++)
			new Class($(c[i]), deepCopy(options, i+1<c.length), ...args);
		
		return c;
	}
	
	$.fn.qwerPanel = function(options, name)
	{
		return createEach(this, QwerPanel, options, name);
	};
	
	$.fn.qwerForm = function(options)
	{
		return createEach(this, QwerForm, options);
	};
	
	$.fn.qwerFlyout = function(options)
	{
		return createEach(this, QwerFlyout, options);
	};
	
	$.fn.qwerMenu = function(options)
	{
		return createEach(this, QwerMenu, options);
	};
	
	$.fn.qwerSelect = function(options)
	{
		return createEach(this, QwerSelect, options);
	};
	
	$.fn.qwerTreeItem = function(options)
	{
		return createEach(this, QwerTreeItem, options);
	};
});