class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    clone() {
        return new Vector(this.x, this.y);
    }
}

class World {
    constructor() {
        this.onClick = this.onClick.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onResize = this.onResize.bind(this);
    }

    initialize() {
        this.ship = new Ship(this);
        this.ship.initialize();

        this.objects = [this.ship];
        this.lastTick = Date.now();

        this.updateBounds();
        this.addEventListeners();

        document.body.style.overflowX = 'hidden';

        this.intervalHandle = setInterval(this.tick.bind(this), 1000 / 60);
    }

    destroy() {
        this.objects.forEach(obj => obj.destroy());
        this.removeEventListeners();
        clearInterval(this.intervalHandle);
    }

    addEventListeners() {
        window.addEventListener('resize', this.onResize);
        document.addEventListener('click', this.onClick);
        document.addEventListener('mousemove', this.onMouseMove);
    }

    removeEventListeners() {
        window.removeEventListener('resize', this.onResize);
        document.removeEventListener('click', this.onClick);
        document.removeEventListener('mousemove', this.onMouseMove);
    }

    onResize(event) {
        this.updateBounds(event);
        this.ship.updateBounds(event);
    }

    eventLocation(event) {
        return new Vector(event.clientX, event.clientY + document.documentElement.scrollTop);
    }

    onMouseMove(event) {
        this.ship.aimAt(this.eventLocation(event));
    }

    onClick(event) {
        this.ship.fireAt(this.eventLocation(event));
    }

    addObject(obj) {
        obj.initialize();
        this.objects.push(obj);
    }

    updateBounds() {
        this.bounds = new DOMRect(0, 0, document.documentElement.scrollWidth, document.documentElement.scrollHeight);
    }

    tick() {
        let now = Date.now();
        let elapsedMs = now - this.lastTick;
        this.lastTick = now;

        for (let i = this.objects.length - 1; i >= 0; i--) {
            let obj = this.objects[i];
            obj.tick(elapsedMs);
            if (obj.destroyed) {
                this.objects.splice(i, 1);
            }
        }
    }
}

class GameObject {
    constructor(world, location) {
        this.world = world;
        this.location = location;
        this.destroyed = false;
    }

    initialize() { }

    destroy() {
        this.destroyed = true;
    }

    tick(elapsedMs) { }
}

class Ship extends GameObject {
    constructor(world) {
        super(world, new Vector(0, 0));
    }

    initialize() {
        super.initialize();

        this.el = document.getElementById('spaceship');
        this.el.style.zIndex = 1000;
        this.el.style.position = 'relative';

        this.updateBounds();
    }

    destroy() {
        this.el.style.zIndex = '';
        this.el.style.position = '';
        this.el.style.transform = '';
        super.destroy();
    }

    aimAt(location) {
        let v = location.sub(this.location);
        let angle = (Math.atan2(v.y, v.x) - Math.atan2(-1, 0)) * 180 / Math.PI;
        this.el.style.transform = `rotate(${angle}deg)`;
    }

    fireAt(location) {
        let velocity = location.sub(this.location);

        const MIN_MAGNITUDE = 300;
        let magnitude = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
        if (magnitude < MIN_MAGNITUDE) {
            velocity.x *= MIN_MAGNITUDE / magnitude;
            velocity.y *= MIN_MAGNITUDE / magnitude;
        }

        let bullet = new Bullet(this.world, 3, this.location.clone(), velocity);
        this.world.addObject(bullet);
    }

    updateBounds() {
        let bounds = this.el.getBoundingClientRect();
        this.location.x = bounds.x + bounds.width / 2;
        this.location.y = bounds.y + bounds.height / 2 + document.documentElement.scrollTop;
    }
}

class AnimatedGameObject extends GameObject {
    constructor(world, location, velocity) {
        super(world, location);
        this.world = world;
        this.location = location;
        this.velocity = velocity;
    }

    initialize() {
        super.initialize();

        this.el = this.makeEl();
        document.body.appendChild(this.el);

        this.tick(0);
    }

    destroy() {
        document.body.removeChild(this.el);
        super.destroy();
    }

    makeEl() {
        throw new Error("Unimplemented");
    }

    tick(elapsedMs) {
        this.location.x += this.velocity.x * elapsedMs / 1000;
        this.location.y += this.velocity.y * elapsedMs / 1000;
        this.el.style.left = `${Math.floor(this.location.x - this.el.width / 2)}px`;
        this.el.style.top = `${Math.floor(this.location.y - this.el.height / 2)}px`;
    }
}

class Bullet extends AnimatedGameObject {
    constructor(world, radius, location, velocity) {
        super(world, location, velocity);
        this.radius = radius;
    }

    makeEl() {
        let el = document.createElement('canvas');
        el.width = this.radius * 2;
        el.height = this.radius * 2;
        el.style.position = 'absolute';
        el.style.zIndex = 100;

        let ctx = el.getContext('2d');
        ctx.beginPath();
        ctx.arc(this.radius, this.radius, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        return el;
    }

    tick(elapsedMs) {
        super.tick(elapsedMs);

        let bounds = this.el.getBoundingClientRect();
        if (bounds.right < 0 ||
            bounds.bottom + document.documentElement.scrollTop < 0 ||
            bounds.left > this.world.bounds.width ||
            bounds.top + document.documentElement.scrollTop > this.world.bounds.height) {
            this.destroy();
        }
    }
}

onload = (event) => {
    let world;
    let spaceship = document.getElementById('spaceship');
    spaceship.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        if (world) return;

        world = new World();
        world.initialize();
        spaceship.classList.remove('wiggle');
    });
    window.addEventListener('keydown', event => {
        if (!world) return;
        if (event.key === 'Escape') {
            world.destroy();
            world = null;
            spaceship.classList.add('wiggle');
        }
    });
};