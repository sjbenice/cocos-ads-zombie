// https://github.com/evanw/csg.js/
// Constructive Solid Geometry (CSG) is a modeling technique that uses Boolean
// operations like union and intersection to combine 3D solids. This library
// implements CSG operations on meshes elegantly and concisely using BSP trees,
// and is meant to serve as an easily understandable implementation of the
// algorithm. All edge cases involving overlapping coplanar polygons in both
// solids are correctly handled.
// Example usage:
// 
//     var cube = CSG.cube();
//     var sphere = CSG.sphere({ radius: 1.3 });
//     var polygons = cube.subtract(sphere).toPolygons();

import { Mesh, primitives, utils, v3, Vec2, Vec3 } from "cc";

interface IGeometry extends primitives.IGeometry {
	indices?: number[];
    tangents?: number[];
}

class Indexer {
	unique:Vertex[] = [];
	indices:number[] = [];
	map = {};

	add (vertex:Vertex) {
		var str = JSON.stringify(vertex);
		str in this.map || (this.map[str] = this.unique.length,	this.unique.push(vertex));
		return this.map[str];
	}
}

export class CSG {
	polygons: Polygon[];

	protected static _tempVec2_0:Vec2 = Vec2.ZERO.clone();
	protected static _tempVec2_1:Vec2 = Vec2.ZERO.clone();
	protected static _tempVec2_2:Vec2 = Vec2.ZERO.clone();
	protected static _tempVec2_3:Vec2 = Vec2.ZERO.clone();
	protected static _tempVec2_4:Vec2 = Vec2.ZERO.clone();
	protected static _tempVec3:Vec3 = Vec3.ZERO.clone();

	constructor() {
		this.polygons = [];
	}

	static toMesh(csg:CSG) : Mesh {
		if (csg && csg.polygons && csg.polygons.length > 0) {
            let iGeometry: IGeometry = { positions: [], indices: [], normals: [], uvs:[] };
			let indexer = new Indexer();
			csg.toPolygons().map(function(polygon) {
				var indices = polygon.vertices.map(function(vertex) {
					// vertex.color = polygon.shared || [1, 1, 1];???
					return indexer.add(vertex)
				});
				for (var i = 2; i < indices.length; i++) {
					iGeometry.indices.push(indices[0], indices[i - 1], indices[i]);
				}
			});

			indexer.unique.forEach(element => {
				iGeometry.positions.push(element.pos.x, element.pos.y, element.pos.z);
				iGeometry.normals.push(element.normal.x, element.normal.y, element.normal.z);
				if (iGeometry.uvs && element.uv)
					iGeometry.uvs.push(element.uv.x, element.uv.y);
			});
			
            // iGeometry.customAttributes = [];
            // if (hull.colors) {
            //     iGeometry.normals = writeAttribute(hull.colors);
            // }
            // if (hull.tangents) {
            //     iGeometry.customAttributes.push({ attr: new gfx.Attribute(gfx.AttributeName.ATTR_TANGENT, gfx.Format.RGB32F), values: writeAttribute(hull.tangents) })
            //     iGeometry.tangents = writeAttribute(hull.tangents);
            // }

			const mesh = utils.MeshUtils.createMesh(iGeometry, new Mesh(), { calculateBounds: true });

			return mesh;
		}

		return null;
	}

	protected static fromPolygons(polygons: Polygon[]): CSG {
		const csg = new CSG();
		csg.polygons = polygons;
		return csg;
	}

	static fromMesh(mesh:Mesh) : CSG {
		const csg = new CSG();
        let iGeometry:IGeometry = utils.readMesh(mesh);

		function createVectorFromIndex(index:number, array:number[]) {
			index *= 3;
			return new Vector(array[index], array[index + 1], array[index + 2]);
		}

		function createUVFromIndex(index:number, array:number[]) {
			index *= 2;
			return new Vec2(array[index], array[index + 1]);
		}

		function createVertexFromIndex(index:number) : Vertex {
			return new Vertex(createVectorFromIndex(index, iGeometry.positions), 
							createVectorFromIndex(index, iGeometry.normals),
							createUVFromIndex(index, iGeometry.uvs));
		}

		function addPolygon(vertices:Vertex[]) : boolean {
			let ret:boolean = false;
			if (vertices.length >= 3) {
				csg.polygons.push(new Polygon(vertices));
				ret = true;
			}

			return ret;
		}

		let vertices:Vertex[] = [];
		let startIndex:number = -1;
		let endIndex:number = -1;

		for (let index = 0; index < iGeometry.indices.length; index+= 3) {
			const first = iGeometry.indices[index];
			const second = iGeometry.indices[index + 1];
			const third = iGeometry.indices[index + 2];

			if (startIndex >= 0) {
				if (startIndex == first && endIndex == second) {
					endIndex = third;
					vertices.push(createVertexFromIndex(third));
				} else {
					startIndex = -1;
					addPolygon(vertices);
					vertices = [];
				}
			}

			if (startIndex < 0) {
				startIndex = first;
				endIndex = third;

				vertices.push(createVertexFromIndex(first));
				vertices.push(createVertexFromIndex(second));
				vertices.push(createVertexFromIndex(third));
			}
		}

		addPolygon(vertices);

		return csg;
	}

	clone(): CSG {
		const csg = new CSG();
		csg.polygons = this.polygons.map(p => p.clone());
		return csg;
	}

	protected toPolygons(): Polygon[] {
		return this.polygons;
	}

	union(csg: CSG): CSG {
		try {
			const a = new Node(this.clone().polygons);
			const b = new Node(csg.clone().polygons);
			a.clipTo(b);
			b.clipTo(a);
			b.invert();
			b.clipTo(a);
			b.invert();
			a.build(b.allPolygons());
			return CSG.fromPolygons(a.allPolygons());
		} catch (error) {
			console.log('union faild for polygons:', this.polygons.length);
		}
		return null;
	}

	subtract(csg: CSG): CSG {
		try {
			const a = new Node(this.clone().polygons);
			const b = new Node(csg.clone().polygons);
			a.invert();
			a.clipTo(b);
			b.clipTo(a);
			b.invert();
			b.clipTo(a);
			b.invert();
			a.build(b.allPolygons());
			a.invert();
			return CSG.fromPolygons(a.allPolygons());
		} catch (error) {
			console.log('subtract faild for polygons:', this.polygons.length);
		}
		return null;
	}

	intersect(csg: CSG): CSG {
		try {
			const a = new Node(this.clone().polygons);
			const b = new Node(csg.clone().polygons);
			a.invert();
			b.clipTo(a);
			b.invert();
			a.clipTo(b);
			b.clipTo(a);
			a.build(b.allPolygons());
			a.invert();
			return CSG.fromPolygons(a.allPolygons());
		} catch (error) {
			console.log('intersect faild for polygons:', this.polygons.length);
		}
		return null;
	}

	inverse(): CSG {
		try {
			const csg = this.clone();
			csg.polygons.forEach(p => p.flip());
			return csg;
		} catch (error) {
			console.log('inverse faild for polygons:', this.polygons.length);
		}
		return null;
	}

	centerize(): Vec3 {
		const min:Vec3 = v3(Infinity, Infinity, Infinity);
		const max:Vec3 = v3(-Infinity, -Infinity, -Infinity);

		if (this.polygons) {
			this.polygons.forEach(polygon => {
				polygon.vertices.forEach(vetex => {
					const pos = vetex.pos;
					if (pos.x > max.x)
						max.x = pos.x;
					if (pos.x < min.x)
						min.x = pos.x;
					if (pos.y > max.y)
						max.y = pos.y;
					if (pos.y < min.y)
						min.y = pos.y;
					if (pos.z > max.z)
						max.z = pos.z;
					if (pos.z < min.z)
						min.z = pos.z;
				})
			});
		}

		const center = max.add(min).multiplyScalar(0.5);

		if (this.polygons) {
			this.polygons.forEach(polygon => {
				polygon.vertices.forEach(vetex => {
					const pos = vetex.pos;
					pos.x -= center.x;
					pos.y -= center.y;
					pos.z -= center.z;
				})
			});
		}

		return center;
	}

	static cubeTest(options: { center?: [number, number, number]; radius?: number | [number, number, number] } = {}): CSG {
		const c = new Vector(options.center || [0, 0, 0]);
		const r = Array.isArray(options.radius) ? options.radius : [options.radius || 1, options.radius || 1, options.radius || 1];
		return CSG.fromPolygons([
			// [[0, 4, 6, 2], [-1, 0, 0]],// back-x
			// [[1, 3, 7, 5], [+1, 0, 0]],// front+x
			// [[0, 1, 5, 4], [0, -1, 0]],// bottom-y
			[[2, 6, 7, 3], [0, +1, 0]],// top+y
			// [[0, 2, 3, 1], [0, 0, -1]],// right-z
			// [[4, 5, 7, 6], [0, 0, +1]]// left+z
		].map(info => new Polygon(info[0].map(i => {
			const pos = new Vector(
				c.x + r[0] * (i & 1 ? 1 : -1),
				c.y + r[1] * (i & 2 ? 1 : -1),
				c.z + r[2] * (i & 4 ? 1 : -1)
			);
			const normal = new Vector(info[1][0],info[1][1],info[1][2]);
			const uv = new Vec2();
			if (normal.y != 0) {
				uv.x = i & 1 ? 0 : 1
				if (normal.y > 0)
					uv.y = i & 4 ? 0 : 1;
				else
					uv.y = i & 4 ? 1 : 0;
			} else if (normal.x != 0) {
				if (normal.x > 0)
					uv.x = i & 4 ? 0 : 1;
				else
					uv.x = i & 4 ? 1 : 0;
				uv.y = i & 2 ? 0 : 1;
			} else if (normal.z != 0) {
				uv.x = i & 1 ? 0 : 1;
				if (normal.z > 0)
					uv.y = i & 2 ? 1 : 0;
				else
					uv.y = i & 2 ? 0 : 1;
			}

			return new Vertex(pos, normal, uv);
		}))));
	}

	static cube(options: { center?: [number, number, number]; radius?: number | [number, number, number] } = {}): CSG {
		const c = new Vector(options.center || [0, 0, 0]);
		const r = Array.isArray(options.radius) ? options.radius : [options.radius || 1, options.radius || 1, options.radius || 1];
		return CSG.fromPolygons([
			[[0, 4, 6, 2], [-1, 0, 0]],// back-x
			[[1, 3, 7, 5], [+1, 0, 0]],// front+x
			[[0, 1, 5, 4], [0, -1, 0]],// bottom-y
			[[2, 6, 7, 3], [0, +1, 0]],// top+y
			[[0, 2, 3, 1], [0, 0, -1]],// right-z
			[[4, 5, 7, 6], [0, 0, +1]]// left+z
		].map(info => new Polygon(info[0].map(i => {
			const pos = new Vector(
				c.x + r[0] * (i & 1 ? 1 : -1),
				c.y + r[1] * (i & 2 ? 1 : -1),
				c.z + r[2] * (i & 4 ? 1 : -1)
			);
			const normal = new Vector(info[1][0],info[1][1],info[1][2]);
			const uv = new Vec2();
			if (normal.y != 0) {
				uv.x = i & 1 ? 0 : 1
				if (normal.y > 0)
					uv.y = i & 4 ? 0 : 1;
				else
					uv.y = i & 4 ? 1 : 0;
			} else if (normal.x != 0) {
				if (normal.x > 0)
					uv.x = i & 4 ? 0 : 1;
				else
					uv.x = i & 4 ? 1 : 0;
				uv.y = i & 2 ? 0 : 1;
			} else if (normal.z != 0) {
				uv.x = i & 1 ? 0 : 1;
				if (normal.z > 0)
					uv.y = i & 2 ? 1 : 0;
				else
					uv.y = i & 2 ? 0 : 1;
			}

			return new Vertex(pos, normal, uv);
		}))));
	}

	static sphere(options: { center?: [number, number, number]; radius?: number; slices?: number; stacks?: number } = {}): CSG {
		const c = new Vector(options.center || [0, 0, 0]);
		const r = options.radius || 1;
		const slices = options.slices || 16;
		const stacks = options.stacks || 8;
		const polygons: Polygon[] = [];
		let vertices: Vertex[];

		const vertex = (theta: number, phi: number) => {
			theta *= Math.PI * 2;
			phi *= Math.PI;
			const dir = new Vector(
				Math.cos(theta) * Math.sin(phi),
				Math.cos(phi),
				Math.sin(theta) * Math.sin(phi)
			);
			vertices.push(new Vertex(c.plus(dir.times(r)), dir, null));
		};

		for (let i = 0; i < slices; i++) {
			for (let j = 0; j < stacks; j++) {
				vertices = [];
				vertex(i / slices, j / stacks);
				if (j > 0) vertex((i + 1) / slices, j / stacks);
				if (j < stacks - 1) vertex((i + 1) / slices, (j + 1) / stacks);
				vertex(i / slices, (j + 1) / stacks);
				polygons.push(new Polygon(vertices));
			}
		}
		return CSG.fromPolygons(polygons);
	}

	static cylinder(options: { start?: [number, number, number]; end?: [number, number, number]; radius?: number; slices?: number } = {}): CSG {
		const s = new Vector(options.start || [0, -1, 0]);
		const e = new Vector(options.end || [0, 1, 0]);
		const ray = e.minus(s);
		const r = options.radius || 1;
		const slices = options.slices || 16;
		const axisZ = ray.unit();
		const isY = (Math.abs(axisZ.y) > 0.5);
		const axisX = new Vector(isY ? 1 : 0, isY ? 0 : 1, 0).cross(axisZ).unit();
		const axisY = axisX.cross(axisZ).unit();
		const start = new Vertex(s, axisZ.negated(), null);
		const end = new Vertex(e, axisZ.unit(), null);
		const polygons: Polygon[] = [];

		const point = (stack: number, slice: number, normalBlend: number) => {
			const angle = slice * Math.PI * 2;
			const out = axisX.times(Math.cos(angle)).plus(axisY.times(Math.sin(angle)));
			const pos = s.plus(ray.times(stack)).plus(out.times(r));
			const normal = out.times(1 - Math.abs(normalBlend)).plus(axisZ.times(normalBlend));
			return new Vertex(pos, normal, null);
		};

		for (let i = 0; i < slices; i++) {
			const t0 = i / slices;
			const t1 = (i + 1) / slices;
			polygons.push(new Polygon([start, point(0, t0, -1), point(0, t1, -1)]));// bottom
			polygons.push(new Polygon([point(0, t1, 0), point(0, t0, 0), point(1, t0, 0), point(1, t1, 0)]));// side
			polygons.push(new Polygon([end, point(1, t1, 1), point(1, t0, 1)]));// top
		}
		return CSG.fromPolygons(polygons);
	}

	static cube1(startX:number, startZ:number, endX:number, endZ:number, height:number, lineWidth:number, 
		buildTopBotton:boolean, center?:Vec3): CSG {
		height /= 2;
		const c = center || Vec3.ZERO;

		CSG._tempVec2_0.set(startX, startZ);// A
		CSG._tempVec2_1.set(endX, endZ);// B

		// Direction vector from A to B
		const unitDir = Vec2.subtract(CSG._tempVec2_4, CSG._tempVec2_1, CSG._tempVec2_0).normalize();

		// Offset for the cap extension
		const capOffset = unitDir.multiplyScalar(lineWidth / 2);

		// Perpendicular vector to the direction
		const perp = CSG._tempVec2_3.set(-unitDir.y, unitDir.x);
		// console.log(CSG._tempVec2_0, CSG._tempVec2_1, perp);

		const xz = [];

		Vec2.subtract(CSG._tempVec2_2, CSG._tempVec2_1, perp);
		xz.push(CSG._tempVec2_2.x, CSG._tempVec2_2.y);

		Vec2.add(CSG._tempVec2_2, CSG._tempVec2_1, capOffset);
		xz.push(CSG._tempVec2_2.x, CSG._tempVec2_2.y);

		Vec2.add(CSG._tempVec2_2, CSG._tempVec2_1, perp);
		xz.push(CSG._tempVec2_2.x, CSG._tempVec2_2.y);

		Vec2.add(CSG._tempVec2_2, CSG._tempVec2_0, perp);
		xz.push(CSG._tempVec2_2.x, CSG._tempVec2_2.y);

		// Vec2.subtract(CSG._tempVec2_2, CSG._tempVec2_0, capOffset);
		// xz.push(CSG._tempVec2_2.x, CSG._tempVec2_2.y);

		Vec2.subtract(CSG._tempVec2_2, CSG._tempVec2_0, perp);
		xz.push(CSG._tempVec2_2.x, CSG._tempVec2_2.y);

		return CSG.polyBox(height * 2, xz, buildTopBotton, c);
	}

	static polyBox(height:number, xz:number[], buildTopBotton:boolean=true, center?:Vec3) : CSG {
		const c = center || Vec3.ZERO;

		const yBottom = height / 2;
		const yTop = -height / 2;

		const s = new Vector([0, yBottom, 0]);
		const e = new Vector([0, yTop, 0]);
		const ray = e.minus(s);
		const axisZ = ray.unit();
		const isY = (Math.abs(axisZ.y) > 0.5);
		const axisX = new Vector(isY ? 1 : 0, isY ? 0 : 1, 0).cross(axisZ).unit();
		const axisY = axisX.cross(axisZ).unit();

		let minX = +Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
		for (let index = 0; index < xz.length; index+= 2) {
			const x = xz[index];
			const z = xz[index + 1];
			if (x < minX)
				minX = x;
			if (x > maxX)
				maxX = x;
			if (z < minZ)
				minZ = z;
			if (z > maxZ)
				maxZ = z;
		}

		const centerX = (minX + maxX) / 2, centerZ = (minZ + maxZ) / 2;

		const point = (angle:number, stack: number, pos:number, x: number, z:number, normalBlend: number) => {
			const out = axisX.times(Math.cos(angle)).plus(axisY.times(Math.sin(angle)));
			const normal = out.times(1 - Math.abs(normalBlend)).plus(axisZ.times(normalBlend));
			const uv = pos != 0 ? new Vec2(pos > 0 ? 0 : 1, stack ? 0 : 1) : null;
			return new Vertex(new Vector(x + c.x, (stack ? yTop : yBottom) + c.y, z + c.z), normal, uv);
		};

		const isCounterClockwise = (polygon: Vec2[]) => {
			let sum = 0;
			for (let i = 0; i < polygon.length; i++) {
			  const p1 = polygon[i];
			  const p2 = polygon[(i + 1) % polygon.length];
			  sum += (p2.x - p1.x) * (p2.y + p1.y);
			}
			return sum < 0;
		};

		const polygons: Polygon[] = [];
		let vertices:Vec2[] = [];
		for (let index = 0; index < xz.length; index+= 2) {
			vertices.push(new Vec2(xz[index], xz[index + 1]));
		}
		if (!isCounterClockwise(vertices)) {
			vertices.reverse();
		}
		for (let index = 0; index < vertices.length; index++) {
			const p1 = vertices[index];
			const p0 = vertices[(index + 1) % vertices.length];
			const angle = Math.atan2((p0.x + p1.x) / 2 - centerX, (p0.y + p1.y) / 2 - centerZ) + Math.PI * 1.5;

			polygons.push(new Polygon([
				point(angle, 0, 1, p1.x, p1.y, 0), 
				point(angle, 0, -1, p0.x, p0.y, 0), 
				point(angle, 1, -1, p0.x, p0.y, 0), 
				point(angle, 1, 1, p1.x, p1.y, 0)]));// side
		}

		if (buildTopBotton) {
			const sign = (p1: Vec2, p2: Vec2, p3: Vec2) => {
				return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
			};
			const isPointInTriangle = (p: Vec2, p1: Vec2, p2: Vec2, p3: Vec2) => {
				const d1 = sign(p, p1, p2);
				const d2 = sign(p, p2, p3);
				const d3 = sign(p, p3, p1);
	
				const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
				const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
	
				return !(hasNeg && hasPos);
			};
			const crossProduct = (p1: Vec2, p2: Vec2, p3: Vec2) => {
				return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
			};
			const isConvex = (p1: Vec2, p2: Vec2, p3: Vec2) => {
				return crossProduct(p1, p2, p3) > 0;
			};
			const isEar = (vertices: Vec2[], prev: Vec2, curr: Vec2, next: Vec2) => {
				if (!isConvex(prev, curr, next)) return false;
		
				for (const p of vertices) {
					if (p !== prev && p !== curr && p !== next && isPointInTriangle(p, prev, curr, next)) {
						return false;
					}
				}
		
				return true;
			};
	
			const triangulate = (polygon: number[]) => {
				const triangles: Vec2[][] = [];
	
				let vertices = [];
				for (let index = 0; index < polygon.length; index+= 2) {
					vertices.push(new Vec2(polygon[index], polygon[index + 1]));
				}
	
				if (!isCounterClockwise(vertices)) {
					vertices.reverse();
				}
			  
				while (vertices.length >= 3) {
					const n = vertices.length;
					let earFound = false;
	
					for (let i = 0; i < n; i++) {
						const prevIndex = (i - 1 + n) % n;
						const nextIndex = (i + 1) % n;
	
						const prev = vertices[prevIndex];
						const curr = vertices[i];
						const next = vertices[nextIndex];
	
						if (isEar(vertices, prev, curr, next)) {
							triangles.push([prev, curr, next]);
							vertices.splice(i, 1);
							earFound = true;
							break;
						}
					}
	
					if (!earFound) {
						console.log("Failed to triangulate polygon; possible issues with polygon's convexity or simplicity.");
						break;
					}
				}
	
				return triangles;
			};
			const triangles: Vec2[][] = triangulate(xz);
			if (triangles) {
				triangles.forEach(triangle => {
					polygons.push(new Polygon(triangle.map(v => point(0, 1, 0, v.x, v.y, 1))));// top
					triangle.reverse();
					polygons.push(new Polygon(triangle.map(v => point(0, 0, 0, v.x, v.y, -1))));// bottom
				});
			}
		}

		return CSG.fromPolygons(polygons);
	}
}

// # class Vector

// Represents a 3D vector.
// 
// Example usage:
// 
//     new CSG.Vector(1, 2, 3);
//     new CSG.Vector([1, 2, 3]);
//     new CSG.Vector({ x: 1, y: 2, z: 3 });

class Vector {
	x: number;
	y: number;
	z: number;
	// uid:number = 0;
	// static sequence:number = 0;
	
	constructor(xOrCoords: number | [number, number, number], y?: number, z?: number) {
		if (Array.isArray(xOrCoords)) {
			// Constructor with array input
			[this.x, this.y, this.z] = xOrCoords;
		} else {
			// Constructor with individual x, y, z inputs
			this.x = xOrCoords;
			this.y = y!;
			this.z = z!;
		}
		// this.uid = Vector.sequence ++;
	}

	clone(): Vector {
		return new Vector(this.x, this.y, this.z);
	}

	negated(): Vector {
		return new Vector(-this.x, -this.y, -this.z);
	}

	plus(a: Vector): Vector {
		return new Vector(this.x + a.x, this.y + a.y, this.z + a.z);
	}

	minus(a: Vector): Vector {
		return new Vector(this.x - a.x, this.y - a.y, this.z - a.z);
	}

	times(a: number): Vector {
		return new Vector(this.x * a, this.y * a, this.z * a);
	}

	dividedBy(a: number): Vector {
		return new Vector(this.x / a, this.y / a, this.z / a);
	}

	dot(a: Vector): number {
		return this.x * a.x + this.y * a.y + this.z * a.z;
	}

	lerp(a: Vector, t: number): Vector {
		return this.plus(a.minus(this).times(t));
	}

	length(): number {
		return Math.sqrt(this.dot(this));
	}

	unit(): Vector {
		return this.dividedBy(this.length());
	}

	cross(a: Vector): Vector {
		return new Vector(
			this.y * a.z - this.z * a.y,
			this.z * a.x - this.x * a.z,
			this.x * a.y - this.y * a.x
		);
	}

	static unitX(): Vector {
		return new Vector(1, 0, 0);
	}

	static unitY(): Vector {
		return new Vector(0, 1, 0);
	}

	static unitZ(): Vector {
		return new Vector(0, 0, 1);
	}
}

// # class Vertex

// Represents a vertex of a polygon. Use your own vertex class instead of this
// one to provide additional features like texture coordinates and vertex
// colors. Custom vertex classes need to provide a `pos` property and `clone()`,
// `flip()`, and `interpolate()` methods that behave analogous to the ones
// defined by `CSG.Vertex`. This class provides `normal` so convenience
// functions like `CSG.sphere()` can return a smooth vertex normal, but `normal`
// is not used anywhere else.

class Vertex {
	pos: Vector;
	normal: Vector;
	uv:Vec2;
	// uid:number = 0;
	// static sequence:number = 0;

	constructor(pos: Vector, normal: Vector, uv:Vec2) {
		this.pos = pos;
		this.normal = normal;
		this.uv = uv;
		// this.uid = Vertex.sequence ++;
	}

	clone(): Vertex {
		return new Vertex(this.pos.clone(), this.normal.clone(), this.uv ? this.uv.clone() : null);
	}

	flip(): void {
		this.normal = this.normal.negated();
	}

	interpolate(other: Vertex, t: number): Vertex {
		const uv = this.uv ? this.uv.clone().lerp(other.uv, t) : null;
		return new Vertex(
			this.pos.lerp(other.pos, t),
			this.normal.lerp(other.normal, t),
			uv
		);
	}
}

// # class Polygon

// Represents a convex polygon. The vertices used to initialize a polygon must
// be coplanar and form a convex loop. They do not have to be `CSG.Vertex`
// instances but they must behave similarly (duck typing can be used for
// customization).
// 
// Each convex polygon has a `shared` property, which is shared between all
// polygons that are clones of each other or were split from the same polygon.
// This can be used to define per-polygon properties (such as surface color).

class Polygon {
	vertices: Vertex[];
	shared: any;
	plane: Plane;

	constructor(vertices: Vertex[], shared?: any) {
		this.vertices = vertices;
		this.shared = shared;
		this.plane = Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
	}

	clone(): Polygon {
		const vertices = this.vertices.map(v => v.clone());
		return new Polygon(vertices, this.shared);
	}

	flip(): void {
		this.vertices.reverse().map(v => v.flip());
		this.plane.flip();
	}
}

// # class Plane
// Represents a plane in 3D space.

class Plane {
	normal: Vector;
	w: number;

	constructor(normal: Vector, w: number) {
		this.normal = normal;
		this.w = w;
	}

	static fromPoints(a: Vector, b: Vector, c: Vector): Plane {
		const n = b.minus(a).cross(c.minus(a)).unit();
		return new Plane(n, n.dot(a));
	}

	flip(): void {
		this.normal = this.normal.negated();
		this.w = -this.w;
	}

	clone (): Plane {
		return new Plane(this.normal.clone(), this.w);
	}
	
	// Split `polygon` by this plane if needed, then put the polygon or polygon
	// fragments in the appropriate lists. Coplanar polygons go into either
	// `coplanarFront` or `coplanarBack` depending on their orientation with
	// respect to this plane. Polygons in front or in back of this plane go into
	// either `front` or `back`.
	splitPolygon(polygon: Polygon, coplanarFront: Polygon[], coplanarBack: Polygon[], front: Polygon[], back: Polygon[]): void {
		const COPLANAR = 0;
		const FRONT = 1;
		const BACK = 2;
		const SPANNING = 3;

		const EPSILON = 1e-5;
		let polygonType = 0;
		const types: number[] = [];

		polygon.vertices.forEach((vertex) => {
			const t = this.normal.dot(vertex.pos) - this.w;
			const type = (t < -EPSILON) ? BACK : (t > EPSILON) ? FRONT : COPLANAR;
			polygonType |= type;
			types.push(type);
		});

		switch (polygonType) {
			case COPLANAR:
				(this.normal.dot(polygon.vertices[0].normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
				break;
			case FRONT:
				front.push(polygon);
				break;
			case BACK:
				back.push(polygon);
				break;
			case SPANNING:
				const f: Vertex[] = [];
				const b: Vertex[] = [];
				polygon.vertices.forEach((vertex, i) => {
					const j = (i + 1) % polygon.vertices.length;
					const ti = types[i];
					const tj = types[j];
					const vi = polygon.vertices[i], vj = polygon.vertices[j];
					if (ti !== BACK) f.push(vi);
					if (ti !== FRONT) b.push(ti != BACK ? vi.clone() : vi);
					if ((ti | tj) === SPANNING) {
						const t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.minus(vi.pos));
						const v = vertex.interpolate(vj, t);
						f.push(v);
						b.push(v.clone());
					}
				});
				if (f.length >= 3) front.push(new Polygon(f, polygon.shared));
				if (b.length >= 3) back.push(new Polygon(b, polygon.shared));
				break;
		}
	}
}

// # class Node

// Holds a node in a BSP tree. A BSP tree is built from a collection of polygons
// by picking a polygon to split along. That polygon (and all other coplanar
// polygons) are added directly to that node and the other polygons are added to
// the front and/or back subtrees. This is not a leafy BSP tree since there is
// no distinction between internal and leaf nodes.
class Node {
	plane: Plane;
	front: Node | null;
	back: Node | null;
	polygons: Polygon[];

	constructor(polygons: Polygon[] = []) {
		this.plane = null as any;
		this.front = null;
		this.back = null;
		this.polygons = [];
		if (polygons.length) this.build(polygons);
	}

	clone(): Node {
		const node = new Node();
		node.plane = this.plane.clone();
		node.front = this.front && this.front.clone();
		node.back = this.back && this.back.clone();
		node.polygons = this.polygons.map(p => p.clone());
		return node;
	}

	invert(): void {
		this.polygons.forEach(p => p.flip());
		this.plane.flip();
		if (this.front) this.front.invert();
		if (this.back) this.back.invert();
		[this.front, this.back] = [this.back, this.front];
	}

	clipPolygons(polygons: Polygon[]): Polygon[] {
		if (!this.plane) return polygons.slice();
		let front: Polygon[] = [], back: Polygon[] = [];
		polygons.forEach(p => {
			this.plane.splitPolygon(p, front, back, front, back);
		});
		if (this.front) front = this.front.clipPolygons(front);
		if (this.back) back = this.back.clipPolygons(back);
		else back = [];
		return front.concat(back);
	}

	clipTo(bsp: Node): void {
		this.polygons = bsp.clipPolygons(this.polygons);
		if (this.front) this.front.clipTo(bsp);
		if (this.back) this.back.clipTo(bsp);
	}

	allPolygons(): Polygon[] {
		let polygons = this.polygons.slice();
		if (this.front) polygons = polygons.concat(this.front.allPolygons());
		if (this.back) polygons = polygons.concat(this.back.allPolygons());
		return polygons;
	}

	build(polygons: Polygon[]): void {
		if (!polygons.length) return;
		if (!this.plane) this.plane = polygons[0].plane.clone();
		const front: Polygon[] = [], back: Polygon[] = [];
		polygons.forEach(p => {
			this.plane.splitPolygon(p, this.polygons, this.polygons, front, back);
		});
		if (front.length) {
			if (!this.front) this.front = new Node();
			this.front.build(front);
		}
		if (back.length) {
			if (!this.back) this.back = new Node();
			this.back.build(back);
		}
	}
}
