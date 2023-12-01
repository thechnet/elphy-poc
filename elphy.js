/*
A bad, kind of hackish script that simulates some basic physics on HTML elements.
*/

"use strict";

class Controls {
	#controls = undefined;
	#toggleSimulation = undefined;
	#applyImpulse = undefined;
	#toggleAdvanced = undefined;
	#controlsAdvanced = undefined;
	#impulse = undefined;
	#gravity = undefined;
	#friction = undefined;
	#restitution = undefined;

	constructor() {
		this.#controls = document.getElementById('controls');
		this.#toggleSimulation = document.getElementById('toggleSimulation');
		this.#applyImpulse = document.getElementById('applyImpulse');
		this.#toggleAdvanced = document.getElementById('toggleAdvanced');
		this.#controlsAdvanced = document.getElementById('controlsAdvanced');
		this.#impulse = document.getElementById('impulse');
		this.#gravity = document.getElementById('gravity');
		this.#friction = document.getElementById('friction');
		this.#restitution = document.getElementById('restitution');
	}

	static #magnitude(element) { return element.value / element.max; }
	static #directionAndMagnitude(element) { return Controls.#magnitude(element) * 2 - 1; }
	
	get toggleSimulation() { return this.#toggleSimulation; }
	get applyImpulse() { return this.#applyImpulse; }
	get impulse() { return 500 * Controls.#magnitude(this.#impulse); }
	get gravity() { return 10 * (Controls.#directionAndMagnitude(this.#gravity)); }
	get friction() { return (1 - Controls.#magnitude(this.#friction)); }
	get restitution() { return Controls.#magnitude(this.#restitution); }
	get controlsHeight() { return this.#controls.offsetHeight; }

	toggleAdvanced() {
		if (this.#toggleAdvanced.checked) {
			this.#controlsAdvanced.style.visibility = 'visible';
		} else {
			this.#controlsAdvanced.style.visibility = 'hidden';
		}
	}
}

class Entity {
	element = undefined;
	acceleration = undefined;
	velocity = undefined;
	position = undefined;
	origin = undefined;
	height = undefined;
	width = undefined;

	constructor(element) {
		this.element = element;

		/* Set a temporary origin. These coordinates will be fixed during initialization. */
		let rect = this.element.getBoundingClientRect();
		this.origin = { x: rect.x, y: rect.y };
	}

	static #getRandomInteger(min, max) {
		return Math.random() * (max - min) + min;
	}

	makeMovable() {
		this.element.style.position = 'absolute';

		/* Fix the origin. Changing the position to 'absolute' moves the elements. */

		this.stopAndMoveToOrigin();

		let rect = this.element.getBoundingClientRect();
		this.origin.x -= rect.x - this.origin.x;
		this.origin.y -= rect.y - this.origin.y;
		
		this.stopAndMoveToOrigin();
		
		/* Compute width and height. */

		let style = this.element.currentStyle || window.getComputedStyle(this.element);
		
		let borderWidth = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
		let marginWidth = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
		this.width = this.element.offsetWidth + marginWidth + borderWidth;
		
		let borderHeight = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
		let marginHeight = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
		this.height = this.element.offsetHeight + marginHeight + borderHeight;
	}

	stopAndMoveToOrigin() {
		this.acceleration = { x: 0, y: 0 };
		this.velocity = { x: 0, y: 0 };
		this.position = { x: this.origin.x, y: this.origin.y };
		this.draw();
	}

	addRandomVelocity(min, max) {
		this.velocity.x += Entity.#getRandomInteger(min, max);
		this.velocity.y += Entity.#getRandomInteger(min, max);
	}

	move() {
		let windowWidth = window.innerWidth;
		let windowHeight = window.innerHeight;

		/* Determine horizontal velocity. */
		const MAGIC_DUST = 2; /* yeah... */
		this.velocity.x += this.acceleration.x;
		if (this.position.y <= controls.controlsHeight + MAGIC_DUST || this.position.y + this.height >= windowHeight - MAGIC_DUST) {
			this.velocity.x *= controls.friction;
		}
	
		/* Apply horizontal velocity. */
		this.position.x += this.velocity.x;
		let x_overshoot = this.position.x + this.width - windowWidth;
		if (x_overshoot > 0) {
			let percentage_move_remaining = x_overshoot/this.velocity.x;
			this.velocity.x *= -controls.restitution;
			this.position.x = windowWidth - this.width + this.velocity.x * percentage_move_remaining;
		}
		let x_undershoot = this.position.x;
		if (x_undershoot < 0) {
			let percentage_move_remaining = x_undershoot/this.velocity.x;
			this.velocity.x *= -controls.restitution;
			this.position.x = this.velocity.x * percentage_move_remaining;
		}

		/* Determine vertical velocity. */
		this.velocity.y += this.acceleration.y + controls.gravity;
		
		/* Apply vertical velocity. */
		this.position.y += this.velocity.y;
		let y_overshoot = this.position.y + this.height - windowHeight;
		if (y_overshoot > 0) {
			let percentage_move_remaining = y_overshoot/this.velocity.y;
			this.velocity.y *= -controls.restitution;
			this.position.y = windowHeight - this.height + this.velocity.y * percentage_move_remaining;
		}
		let y_undershoot = this.position.y - controls.controlsHeight;
		if (y_undershoot < 0) {
			let percentage_move_remaining = y_undershoot/this.velocity.y;
			this.velocity.y *= -controls.restitution;
			this.position.y = controls.controlsHeight + this.velocity.y * percentage_move_remaining;
		}
	}

	draw() {
		this.element.style.left = `${parseInt(this.position.x)}px`;
		this.element.style.top = `${parseInt(this.position.y)}px`;
	}
}

class Field {
	static TICKS_PER_SECOND = 30;
	static FRAMES_PER_SECOND = 30;

	entities = [];
	tickInterval = 0;
	frameInterval = 0;

	constructor(id) {
		this.addChildrenAsEntities(document.getElementById(id));
		
		for (let i=0; i<this.entities.length; i++) {
			this.entities[i].makeMovable();
		}
	}

	addChildrenAsEntities(element) {
		if (element.children.length == 0) {
			this.entities.push(new Entity(element));
			return;
		}
		for (let i=0; i<element.children.length; i++) {
			this.addChildrenAsEntities(element.children[i]);
		}
	}

	tick() {
		for (let i=0; i<this.entities.length; i++) {
			this.entities[i].move();
		}
	}

	frame() {
		for (let i=0; i<this.entities.length; i++) {
			this.entities[i].draw();
		}
	}

	toggleSimulation() {
		if (this.tickInterval == 0) {
			controls.toggleSimulation.textContent = 'Stop';
			controls.applyImpulse.disabled = false;
			this.frameInterval = setInterval(() => { field.frame(); }, 1000 /* 1 second */ / Field.FRAMES_PER_SECOND);
			this.tickInterval = setInterval(() => { field.tick(); }, 1000 /* 1 second */ / Field.TICKS_PER_SECOND);
		} else {
			clearInterval(this.tickInterval);
			clearInterval(this.frameInterval);
			this.tickInterval = 0;
			this.frameInterval = 0;
			for (let i=0; i<this.entities.length; i++) {
				this.entities[i].stopAndMoveToOrigin();
			}
			controls.applyImpulse.disabled = true;
			controls.toggleSimulation.textContent = 'Start';
		}
	}

	addImpulse() {
		let impulse = controls.impulse;
		for (let i=0; i<this.entities.length; i++) {
			this.entities[i].addRandomVelocity(-impulse, impulse);
		}
	}
}

let controls = new Controls();
let field = new Field('entities');
