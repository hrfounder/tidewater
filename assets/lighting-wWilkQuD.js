import{C as e,D as t,E as n,M as r,N as i,O as a,P as o,S as s,T as c,_ as l,f as u,j as d,k as f,o as p,v as m,w as h,x as g}from"./Frame-Baeda3sr.js";var _=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].includes(t)||n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].includes(t)}removeEventListener(e,t){let n=this._listeners&&this._listeners[e];if(n===void 0)return;let r=n.indexOf(t);r!==-1&&n.splice(r,1)}dispatchEvent(e){let t=this._listeners&&this._listeners[e.type];if(t!==void 0){e.target=this;for(let n of t.slice())n.call(this,e);e.target=null}}},v=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},y=0,b=new n,x=new t,S=new e,C=new n,w=new n,T=new n,E=new t,ee=new n(1,0,0),D=new n(0,1,0),O=new n(0,0,1),te={type:`added`},ne={type:`removed`},k={type:`childadded`,child:null},A={type:`childremoved`,child:null},j=class r extends _{constructor(){super(),Object.defineProperty(this,"id",{value:y++}),this.uuid=i(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=r.DEFAULT_UP.clone();let a=new n,o=new s,c=new t,l=new n(1,1,1);o._onChange(()=>c.setFromEuler(o,!1)),c._onChange(()=>o.setFromQuaternion(c,void 0,!1)),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:a},rotation:{configurable:!0,enumerable:!0,value:o},quaternion:{configurable:!0,enumerable:!0,value:c},scale:{configurable:!0,enumerable:!0,value:l},modelViewMatrix:{value:new e},normalMatrix:{value:new g}}),this.matrix=new e,this.matrixWorld=new e,this.matrixAutoUpdate=r.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=r.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new v,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.userData={}}onBeforeRender(){}onAfterRender(){}onBeforeShadow(){}onAfterShadow(){}dispose(){this.dispatchEvent({type:`dispose`})}applyMatrix4(e){return this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return x.setFromAxisAngle(e,t),this.quaternion.multiply(x),this}rotateOnWorldAxis(e,t){return x.setFromAxisAngle(e,t),this.quaternion.premultiply(x),this}rotateX(e){return this.rotateOnAxis(ee,e)}rotateY(e){return this.rotateOnAxis(D,e)}rotateZ(e){return this.rotateOnAxis(O,e)}translateOnAxis(e,t){return b.copy(e).applyQuaternion(this.quaternion),this.position.add(b.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ee,e)}translateY(e){return this.translateOnAxis(D,e)}translateZ(e){return this.translateOnAxis(O,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(S.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?C.copy(e):C.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),w.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?S.lookAt(w,C,this.up):S.lookAt(C,w,this.up),this.quaternion.setFromRotationMatrix(S),r&&(S.extractRotation(r.matrixWorld),x.setFromRotationMatrix(S),this.quaternion.premultiply(x.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this||e&&e.isObject3D&&(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(te),k.child=e,this.dispatchEvent(k),k.child=null),this}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(ne),A.child=e,this.dispatchEvent(A),A.child=null),this}removeFromParent(){return this.parent!==null&&this.parent.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),S.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),S.multiply(e.parent.matrixWorld)),e.applyMatrix4(S),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(te),this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n of this.children){let r=n.getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);for(let r of this.children)r.getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(w,e,T),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(w,E,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++){let r=t[n];(r.matrixWorldAutoUpdate===!0||e===!0)&&r.updateMatrixWorld(e)}}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(n===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(n.matrixWorld,this.matrix)),t===!0){let e=this.children;for(let t=0,n=e.length;t<n;t++)e[t].matrixWorldAutoUpdate===!0&&e[t].updateWorldMatrix(!1,!0)}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,e.onBeforeRender!==r.prototype.onBeforeRender&&(this.onBeforeRender=e.onBeforeRender),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t of e.children)this.add(t.clone());return this}};j.DEFAULT_UP=new n(0,1,0),j.DEFAULT_MATRIX_AUTO_UPDATE=!0,j.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0,j.prototype.isObject3D=!0;var re=class extends j{constructor(){super(),this.type=`Group`}};re.prototype.isGroup=!0;var M=class extends j{constructor(){super(),this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new s,this.environmentIntensity=1,this.environmentRotation=new s,this.overrideMaterial=null}copy(e,t){return super.copy(e,t),this.background=e.background,this.environment=e.environment,this.fog=e.fog,this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentRotation.copy(e.environmentRotation),this.environmentIntensity=e.environmentIntensity,this.overrideMaterial=e.overrideMaterial,this.matrixAutoUpdate=e.matrixAutoUpdate,this}};M.prototype.isScene=!0;var ie=35044,ae=35048,N=new n,P=new a,oe={getComponent(e,t){let n=this.array[this._idx(e,t)];return this.normalized?r(n,this.array):n},setComponent(e,t,n){return this.array[this._idx(e,t)]=this.normalized?o(n,this.array):n,this},getX(e){return this.getComponent(e,0)},getY(e){return this.getComponent(e,1)},getZ(e){return this.getComponent(e,2)},getW(e){return this.getComponent(e,3)},setX(e,t){return this.setComponent(e,0,t)},setY(e,t){return this.setComponent(e,1,t)},setZ(e,t){return this.setComponent(e,2,t)},setW(e,t){return this.setComponent(e,3,t)},setXY(e,t,n){return this.setComponent(e,0,t),this.setComponent(e,1,n)},setXYZ(e,t,n,r){return this.setComponent(e,0,t),this.setComponent(e,1,n),this.setComponent(e,2,r)},setXYZW(e,t,n,r,i){return this.setComponent(e,0,t),this.setComponent(e,1,n),this.setComponent(e,2,r),this.setComponent(e,3,i)},applyMatrix3(e){if(this.itemSize===2)for(let t=0;t<this.count;t++)P.fromBufferAttribute(this,t).applyMatrix3(e),this.setXY(t,P.x,P.y);else if(this.itemSize===3)for(let t=0;t<this.count;t++)N.fromBufferAttribute(this,t).applyMatrix3(e),this.setXYZ(t,N.x,N.y,N.z);return this},applyMatrix4(e){for(let t=0;t<this.count;t++)N.fromBufferAttribute(this,t).applyMatrix4(e),this.setXYZ(t,N.x,N.y,N.z);return this},applyNormalMatrix(e){for(let t=0;t<this.count;t++)N.fromBufferAttribute(this,t).applyNormalMatrix(e),this.setXYZ(t,N.x,N.y,N.z);return this},transformDirection(e){for(let t=0;t<this.count;t++)N.fromBufferAttribute(this,t).transformDirection(e),this.setXYZ(t,N.x,N.y,N.z);return this}},F=class extends _{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`BufferAttribute: array should be a Typed Array.`);this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=ie,this.updateRanges=[],this.gpuType=1015,this.version=0,this.onUploadCallback=se}set needsUpdate(e){e===!0&&this.version++}_idx(e,t){return e*this.itemSize+t}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}onUpload(e){return this.onUploadCallback=e,this}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){let r=this.itemSize;e*=r,n*=t.itemSize;for(let i=0;i<r;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}set(e,t=0){return this.array.set(e,t),this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}dispose(){this.dispatchEvent({type:`dispose`})}};Object.assign(F.prototype,oe),F.prototype.isBufferAttribute=!0;function se(){}var ce=class extends F{constructor(e,t,n){super(new Uint16Array(e),t,n)}},le=class extends F{constructor(e,t,n){super(new Uint32Array(e),t,n)}},I=class extends F{constructor(e,t,n){super(new Float32Array(e),t,n)}},L=class e extends F{constructor(e,t,n,r=1){super(e,t,n),this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(){return new e(this.array,this.itemSize).copy(this)}};L.prototype.isInstancedBufferAttribute=!0;var R=class extends _{constructor(e,t){super(),this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=ie,this.updateRanges=[],this.version=0,this.uuid=i(),this.onUploadCallback=se}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}set(e,t=0){return this.array.set(e,t),this}onUpload(e){return this.onUploadCallback=e,this}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0;r<this.stride;r++)this.array[e+r]=t.array[n+r];return this}clone(){return new this.constructor(new this.array.constructor(this.array),this.stride).copy(this)}dispose(){this.dispatchEvent({type:`dispose`})}};R.prototype.isInterleavedBuffer=!0;var ue=class e extends R{constructor(e,t,n=1){super(e,t),this.meshPerAttribute=n}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(){return new e(new this.array.constructor(this.array),this.stride,this.meshPerAttribute)}};ue.prototype.isInstancedInterleavedBuffer=!0;var z=class{constructor(e,t,n,r=!1){this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}_idx(e,t){return e*this.data.stride+this.offset+t}clone(){let e=new this.array.constructor(this.count*this.itemSize);for(let t=0;t<this.count;t++)for(let n=0;n<this.itemSize;n++)e[t*this.itemSize+n]=this.array[this._idx(t,n)];return new F(e,this.itemSize,this.normalized)}};Object.assign(z.prototype,oe),z.prototype.isInterleavedBufferAttribute=!0;var de=0,B=new e,fe=new g,pe=new t,me=new m,V=new n,H=new n;function he(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}var U=class e extends _{constructor(){super(),Object.defineProperty(this,"id",{value:de++}),this.uuid=i(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(he(e)?le:ce)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this.attributesVersion=(this.attributesVersion||0)+1,this}deleteAttribute(e){return delete this.attributes[e],this.attributesVersion=(this.attributesVersion||0)+1,this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;n!==void 0&&(n.applyNormalMatrix(fe.getNormalMatrix(e)),n.needsUpdate=!0);let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return this.applyMatrix4(B.makeRotationFromQuaternion(e))}rotateX(e){return this.applyMatrix4(B.makeRotationX(e))}rotateY(e){return this.applyMatrix4(B.makeRotationY(e))}rotateZ(e){return this.applyMatrix4(B.makeRotationZ(e))}translate(e,t,n){return this.applyMatrix4(B.makeTranslation(e,t,n))}scale(e,t,n){return this.applyMatrix4(B.makeScale(e,t,n))}lookAt(e){return B.lookAt(e,V.set(0,0,0),new n(0,1,0)),pe.setFromRotationMatrix(B),this.applyQuaternion(pe)}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(H).negate(),this.translate(H.x,H.y,H.z)}setFromPoints(e){let t=[];for(let n of e)t.push(n.x,n.y,n.z||0);return this.setAttribute(`position`,new I(t,3))}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new m);let e=this.attributes.position;if(e===void 0){this.boundingBox.makeEmpty();return}this.boundingBox.setFromBufferAttribute(e)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new l);let e=this.attributes.position;if(e===void 0){this.boundingSphere.makeEmpty();return}let t=this.boundingSphere.center;me.setFromBufferAttribute(e).getCenter(t);let n=0;for(let r=0;r<e.count;r++)n=Math.max(n,t.distanceToSquared(V.fromBufferAttribute(e,r)));this.boundingSphere.radius=Math.sqrt(n)}computeTangents(){let e=this.index,t=this.attributes.position,r=this.attributes.normal,i=this.attributes.uv;if(e===null||t===void 0||r===void 0||i===void 0){console.error(`BufferGeometry.computeTangents(): missing required attributes (index, position, normal or uv)`);return}let o=t.count;this.hasAttribute(`tangent`)===!1&&this.setAttribute(`tangent`,new F(new Float32Array(4*o),4));let s=this.getAttribute(`tangent`),c=[],l=[];for(let e=0;e<o;e++)c[e]=new n,l[e]=new n;let u=new n,d=new n,f=new n,p=new a,m=new a,h=new a,g=new n,_=new n,v=(e,n,r)=>{u.fromBufferAttribute(t,e),d.fromBufferAttribute(t,n),f.fromBufferAttribute(t,r),p.fromBufferAttribute(i,e),m.fromBufferAttribute(i,n),h.fromBufferAttribute(i,r),d.sub(u),f.sub(u),m.sub(p),h.sub(p);let a=1/(m.x*h.y-h.x*m.y);isFinite(a)&&(g.copy(d).multiplyScalar(h.y).addScaledVector(f,-m.y).multiplyScalar(a),_.copy(f).multiplyScalar(m.x).addScaledVector(d,-h.x).multiplyScalar(a),c[e].add(g),c[n].add(g),c[r].add(g),l[e].add(_),l[n].add(_),l[r].add(_))},y=this.groups.length?this.groups:[{start:0,count:e.count}];for(let t of y)for(let n=t.start;n<t.start+t.count;n+=3)v(e.getX(n),e.getX(n+1),e.getX(n+2));let b=new n,x=new n,S=new n,C=new n,w=e=>{x.fromBufferAttribute(r,e),S.copy(x);let t=c[e];b.copy(t).sub(x.multiplyScalar(x.dot(t))).normalize(),C.crossVectors(S,t);let n=C.dot(l[e])<0?-1:1;s.setXYZW(e,b.x,b.y,b.z,n)};for(let t of y)for(let n=t.start;n<t.start+t.count;n++)w(e.getX(n))}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t===void 0)return;let r=this.getAttribute(`normal`);if(r===void 0||r.count!==t.count)r=new F(new Float32Array(t.count*3),3),this.setAttribute(`normal`,r);else for(let e=0;e<r.count;e++)r.setXYZ(e,0,0,0);let i=new n,a=new n,o=new n,s=new n,c=new n,l=new n,u=new n,d=new n;if(e)for(let n=0,f=e.count;n<f;n+=3){let f=e.getX(n),p=e.getX(n+1),m=e.getX(n+2);i.fromBufferAttribute(t,f),a.fromBufferAttribute(t,p),o.fromBufferAttribute(t,m),s.subVectors(o,a),c.subVectors(i,a),s.cross(c),l.fromBufferAttribute(r,f),u.fromBufferAttribute(r,p),d.fromBufferAttribute(r,m),l.add(s),u.add(s),d.add(s),r.setXYZ(f,l.x,l.y,l.z),r.setXYZ(p,u.x,u.y,u.z),r.setXYZ(m,d.x,d.y,d.z)}else for(let e=0,n=t.count;e<n;e+=3)i.fromBufferAttribute(t,e),a.fromBufferAttribute(t,e+1),o.fromBufferAttribute(t,e+2),s.subVectors(o,a),c.subVectors(i,a),s.cross(c),r.setXYZ(e,s.x,s.y,s.z),r.setXYZ(e+1,s.x,s.y,s.z),r.setXYZ(e+2,s.x,s.y,s.z);this.normalizeNormals(),r.needsUpdate=!0}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)V.fromBufferAttribute(e,t).normalize(),e.setXYZ(t,V.x,V.y,V.z)}toNonIndexed(){if(this.index===null)return console.warn(`BufferGeometry.toNonIndexed(): geometry is already non-indexed.`),this;let t=new e,n=this.index,r=e=>{let t=e.itemSize,r=new e.array.constructor(n.count*t);for(let i=0;i<n.count;i++){let a=n.getX(i);for(let n=0;n<t;n++)r[i*t+n]=e.array[e._idx(a,n)]}return new F(r,t,e.normalized)};for(let e in this.attributes)t.setAttribute(e,r(this.attributes[e]));for(let e in this.morphAttributes)t.morphAttributes[e]=this.morphAttributes[e].map(r);t.morphTargetsRelative=this.morphTargetsRelative;for(let e of this.groups)t.addGroup(e.start,e.count,e.materialIndex);return t}clone(){return new e().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.name=e.name,e.index!==null&&this.setIndex(e.index.clone());for(let t in e.attributes)this.setAttribute(t,e.attributes[t].clone());for(let t in e.morphAttributes)this.morphAttributes[t]=e.morphAttributes[t].map(e=>e.clone());this.morphTargetsRelative=e.morphTargetsRelative;for(let t of e.groups)this.addGroup(t.start,t.count,t.materialIndex);return e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:`dispose`})}};U.prototype.isBufferGeometry=!0;var ge=class e extends U{constructor(){super(),this.type=`InstancedBufferGeometry`,this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}clone(){return new e().copy(this)}};ge.prototype.isInstancedBufferGeometry=!0;var W=class extends j{constructor(e=new U,t=null){super(),this.type=`Mesh`,this.geometry=e,this.material=t,this.count=1}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this.count=e.count,this}};W.prototype.isMesh=!0;var G=new e,_e=new m,ve=new l,ye=class e extends W{constructor(e,t,n){super(e,t),this.type=`InstancedMesh`,this.instanceMatrix=new L(new Float32Array(n*16),16),this.instanceColor=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,G.identity())}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}getColorAt(e,t){return t.fromArray(this.instanceColor.array,e*3)}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new L(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new m),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let t=0;t<this.count;t++)this.getMatrixAt(t,G),_e.copy(e.boundingBox).applyMatrix4(G),this.boundingBox.union(_e)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new l),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let t=0;t<this.count;t++)this.getMatrixAt(t,G),ve.copy(e.boundingSphere).applyMatrix4(G),this.boundingSphere.union(ve)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}clone(t){return new e(this.geometry,this.material,this.count).copy(this,t)}dispose(){this.dispatchEvent({type:`dispose`})}};ye.prototype.isInstancedMesh=!0;var K=new n,be=new a,xe=new a,q=class extends j{constructor(){super(),this.type=`Camera`,this.matrixWorldInverse=new e,this.projectionMatrix=new e,this.projectionMatrixInverse=new e,this.coordinateSystem=h,this.reversedDepth=!0}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this.reversedDepth=e.reversedDepth,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}};q.prototype.isCamera=!0;function Se(e,t,n,r,i,a,o){e.view===null&&(e.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1});let s=e.view;s.enabled=!0,s.fullWidth=t,s.fullHeight=n,s.offsetX=r,s.offsetY=i,s.width=a,s.height=o,e.updateProjectionMatrix()}var Ce=class extends q{constructor(e=50,t=1,n=.1,r=2e3){super(),this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.infiniteFar=!1,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.infiniteFar=e.infiniteFar,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=d*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){return .5*this.getFilmHeight()/Math.tan(f*.5*this.fov)}getEffectiveFOV(){return d*2*Math.atan(Math.tan(f*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){K.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(K.x,K.y).multiplyScalar(-e/K.z),K.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(K.x,K.y).multiplyScalar(-e/K.z)}getViewSize(e,t){return this.getViewBounds(e,be,xe),t.subVectors(xe,be)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,Se(this,e,t,n,r,i,a)}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(f*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(a!==null&&a.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth());let s=this.infiniteFar?1/0:this.far;this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,s,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}};Ce.prototype.isPerspectiveCamera=!0;var we=class extends q{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){Se(this,e,t,n,r,i,a)}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t,c=this.view;if(c!==null&&c.enabled){let e=(this.right-this.left)/c.fullWidth/this.zoom,t=(this.top-this.bottom)/c.fullHeight/this.zoom;i+=e*c.offsetX,a=i+e*c.width,o-=t*c.offsetY,s=o-t*c.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}};we.prototype.isOrthographicCamera=!0;function J(e,t,n,r,i){t&&e.setIndex(t),e.setAttribute(`position`,new I(n,3)),e.setAttribute(`normal`,new I(r,3)),e.setAttribute(`uv`,new I(i,2))}var Te=class extends U{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++)p.push(n*u-i,-t,0),m.push(0,0,1),h.push(n/o,1-e/s)}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a,r,i,a)}J(this,f,p,m,h)}},Ee=class extends U{constructor(e=1,t=1,r=1,i=1,a=1,o=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:r,widthSegments:i,heightSegments:a,depthSegments:o},i=Math.floor(i),a=Math.floor(a),o=Math.floor(o);let s=[],c=[],l=[],u=[],d=0,f=0,p=new n,m=(e,t,n,r,i,a,o,m,h,g,_)=>{let v=a/h,y=o/g,b=a/2,x=o/2,S=m/2,C=h+1,w=g+1,T=0,E=0;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++){let d=s*v-b;p[e]=d*r,p[t]=o*i,p[n]=S,c.push(p.x,p.y,p.z),p[e]=0,p[t]=0,p[n]=m>0?1:-1,l.push(p.x,p.y,p.z),u.push(s/h,1-a/g),T++}}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d,r=n+t+C*e,i=n+t+C*(e+1),a=n+(t+1)+C*(e+1),o=n+(t+1)+C*e;s.push(r,i,o,i,a,o),E+=6}this.addGroup(f,E,_),f+=E,d+=T};m(`z`,`y`,`x`,-1,-1,r,t,e,o,a,0),m(`z`,`y`,`x`,1,-1,r,t,-e,o,a,1),m(`x`,`z`,`y`,1,1,e,r,t,i,o,2),m(`x`,`z`,`y`,1,-1,e,r,-t,i,o,3),m(`x`,`y`,`z`,1,-1,e,t,r,i,a,4),m(`x`,`y`,`z`,-1,-1,e,t,-r,i,a,5),J(this,s,c,l,u)}},De=class extends U{constructor(e=1,t=32,r=16,i=0,a=Math.PI*2,o=0,s=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:r,phiStart:i,phiLength:a,thetaStart:o,thetaLength:s},t=Math.max(3,Math.floor(t)),r=Math.max(2,Math.floor(r));let c=Math.min(o+s,Math.PI),l=0,u=[],d=[],f=[],p=[],m=[],h=new n;for(let n=0;n<=r;n++){let d=[],g=n/r,_=0;n===0&&o===0?_=.5/t:n===r&&c===Math.PI&&(_=-.5/t);for(let n=0;n<=t;n++){let r=n/t,c=Math.sin(o+g*s);h.set(-e*Math.cos(i+r*a)*c,e*Math.cos(o+g*s),e*Math.sin(i+r*a)*c),f.push(h.x,h.y,h.z),h.normalize(),p.push(h.x,h.y,h.z),m.push(r+_,1-g),d.push(l++)}u.push(d)}for(let e=0;e<r;e++)for(let n=0;n<t;n++){let t=u[e][n+1],i=u[e][n],a=u[e+1][n],s=u[e+1][n+1];(e!==0||o>0)&&d.push(t,i,s),(e!==r-1||c<Math.PI)&&d.push(i,a,s)}J(this,d,f,p,m)}},Oe=class extends U{constructor(e=1,t=1,r=1,i=32,a=1,o=!1,s=0,c=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:r,radialSegments:i,heightSegments:a,openEnded:o,thetaStart:s,thetaLength:c},i=Math.floor(i),a=Math.floor(a);let l=[],u=[],d=[],f=[],p=[],m=r/2,h=0,g=0,_=new n;{let n=0,o=(t-e)/r;for(let n=0;n<=a;n++){let l=[],g=n/a,v=g*(t-e)+e;for(let e=0;e<=i;e++){let t=e/i,n=t*c+s,a=Math.sin(n),p=Math.cos(n);u.push(v*a,-g*r+m,v*p),_.set(a,o,p).normalize(),d.push(_.x,_.y,_.z),f.push(t,1-g),l.push(h++)}p.push(l)}for(let r=0;r<i;r++)for(let i=0;i<a;i++){let o=p[i][r],s=p[i+1][r],c=p[i+1][r+1],u=p[i][r+1];(e>0||i!==0)&&(l.push(o,s,u),n+=3),(t>0||i!==a-1)&&(l.push(s,c,u),n+=3)}this.addGroup(g,n,0),g+=n}let v=n=>{let r=h,a=n===!0?e:t,o=n===!0?1:-1,p=0;for(let e=1;e<=i;e++)u.push(0,m*o,0),d.push(0,o,0),f.push(.5,.5),h++;let _=h;for(let e=0;e<=i;e++){let t=e/i*c+s,n=Math.cos(t),r=Math.sin(t);u.push(a*r,m*o,a*n),d.push(0,o,0),f.push(n*.5+.5,r*.5*o+.5),h++}for(let e=0;e<i;e++){let t=r+e,i=_+e;n===!0?l.push(i,i+1,t):l.push(i+1,i,t),p+=3}this.addGroup(g,p,n===!0?1:2),g+=p};o===!1&&(e>0&&v(!0),t>0&&v(!1)),J(this,l,u,d,f)}},ke=class extends Oe{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}},Ae=class extends U{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type=`CircleGeometry`,this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let i=[],a=[0,0,0],o=[0,0,1],s=[.5,.5];for(let i=0;i<=t;i++){let c=n+i/t*r,l=e*Math.cos(c),u=e*Math.sin(c);a.push(l,u,0),o.push(0,0,1),s.push((l/e+1)/2,(u/e+1)/2)}for(let e=1;e<=t;e++)i.push(e,e+1,0);J(this,i,a,o,s)}},je=class extends U{constructor(e=1,t=.4,r=12,i=48,a=Math.PI*2,o=0,s=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:r,tubularSegments:i,arc:a,thetaStart:o,thetaLength:s},r=Math.floor(r),i=Math.floor(i);let c=[],l=[],u=[],d=[],f=new n,p=new n;for(let n=0;n<=r;n++){let c=o+n/r*s;for(let o=0;o<=i;o++){let s=o/i*a;f.set((e+t*Math.cos(c))*Math.cos(s),(e+t*Math.cos(c))*Math.sin(s),t*Math.sin(c)),l.push(f.x,f.y,f.z),p.set(e*Math.cos(s),e*Math.sin(s),0),f.sub(p).normalize(),u.push(f.x,f.y,f.z),d.push(o/i,n/r)}}for(let e=1;e<=r;e++)for(let t=1;t<=i;t++){let n=i+1,r=n*e+t-1,a=n*(e-1)+t-1,o=n*(e-1)+t,s=n*e+t;c.push(r,a,s,a,o,s)}J(this,c,l,u,d)}},Me=class extends U{constructor(e=[new a(0,-.5),new a(.5,0),new a(0,.5)],t=12,r=0,i=Math.PI*2){super(),this.type=`LatheGeometry`,this.parameters={points:e,segments:t,phiStart:r,phiLength:i},t=Math.floor(t),i=Math.max(0,Math.min(Math.PI*2,i));let o=[],s=[],c=[],l=[],u=[],d=1/t,f=new n,p=new n,m=new n,h=e.length;for(let t=0;t<=h-1;t++)if(t===0){let t=e[1].x-e[0].x,n=e[1].y-e[0].y;f.set(n,-t,0),m.copy(f),f.normalize(),l.push(f.x,f.y,f.z)}else if(t===h-1)l.push(m.x,m.y,m.z);else{let n=e[t+1].x-e[t].x,r=e[t+1].y-e[t].y;f.set(r,-n,0),p.copy(f),f.add(m).normalize(),l.push(f.x,f.y,f.z),m.copy(p)}for(let n=0;n<=t;n++){let a=r+n*d*i,o=Math.sin(a),f=Math.cos(a);for(let r=0;r<=h-1;r++)s.push(e[r].x*o,e[r].y,e[r].x*f),c.push(n/t,r/(h-1)),u.push(l[3*r]*o,l[3*r+1],l[3*r]*f)}for(let e=0;e<t;e++)for(let t=0;t<h-1;t++){let n=t+e*h,r=n,i=n+h,a=n+h+1,s=n+1;o.push(r,i,s,a,s,i)}this.setIndex(o),this.setAttribute(`position`,new I(s,3)),this.setAttribute(`uv`,new I(c,2)),this.setAttribute(`normal`,new I(u,3))}},Ne=e=>Math.atan2(e.z,-e.x),Pe=e=>Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z)),Fe=class extends U{constructor(e=[],t=[],r=1,i=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:r,detail:i};let o=[],s=[],c=e=>o.push(e.x,e.y,e.z),l=(t,n)=>n.set(e[t*3],e[t*3+1],e[t*3+2]),u=(e,t,n,r)=>{let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)a[r][e]=e===0&&r===i?o:o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(c(a[e][n+1]),c(a[e+1][n]),c(a[e][n])):(c(a[e][n+1]),c(a[e+1][n+1]),c(a[e+1][n]))}},d=new n,f=new n,p=new n;for(let e=0;e<t.length;e+=3)l(t[e],d),l(t[e+1],f),l(t[e+2],p),u(d,f,p,i);let m=new n;for(let e=0;e<o.length;e+=3)m.fromArray(o,e).normalize().multiplyScalar(r),o[e]=m.x,o[e+1]=m.y,o[e+2]=m.z;for(let e=0;e<o.length;e+=3)m.fromArray(o,e),s.push(Ne(m)/2/Math.PI+.5,1-(Pe(m)/Math.PI+.5));let h=new n,g=new n,_=new n,v=new n,y=new a,b=new a,x=new a,S=(e,t,n,r)=>{r<0&&e.x===1&&(s[t]=e.x-1),n.x===0&&n.z===0&&(s[t]=r/2/Math.PI+.5)};for(let e=0,t=0;e<o.length;e+=9,t+=6){h.fromArray(o,e),g.fromArray(o,e+3),_.fromArray(o,e+6),y.fromArray(s,t),b.fromArray(s,t+2),x.fromArray(s,t+4),v.copy(h).add(g).add(_).divideScalar(3);let n=Ne(v);S(y,t,h,n),S(b,t+2,g,n),S(x,t+4,_,n)}for(let e=0;e<s.length;e+=6){let t=s[e],n=s[e+2],r=s[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(s[e]+=1),n<.2&&(s[e+2]+=1),r<.2&&(s[e+4]+=1))}this.setAttribute(`position`,new I(o,3)),this.setAttribute(`normal`,new I(o.slice(),3)),this.setAttribute(`uv`,new I(s,2)),i===0?this.computeVertexNormals():this.normalizeNormals()}},Y=(1+Math.sqrt(5))/2,Ie=[-1,Y,0,1,Y,0,-1,-Y,0,1,-Y,0,0,-1,Y,0,1,Y,0,-1,-Y,0,1,-Y,Y,0,-1,Y,0,1,-Y,0,-1,-Y,0,1],Le=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],Re=class extends Fe{constructor(e=1,t=0){super(Ie,Le,e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}},ze=class extends U{constructor(e,t=64,r=1,i=8,a=!1){super(),this.type=`TubeGeometry`,this.parameters={path:e,tubularSegments:t,radius:r,radialSegments:i,closed:a};let o=e.computeFrenetFrames(t,a);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let s=[],c=[],l=[],u=[],d=new n,f=new n,p=new n,m=n=>{e.getPointAt(n/t,d);let a=o.normals[n],l=o.binormals[n];for(let e=0;e<=i;e++){let t=e/i*Math.PI*2,n=Math.sin(t),o=-Math.cos(t);f.set(o*a.x+n*l.x,o*a.y+n*l.y,o*a.z+n*l.z).normalize(),c.push(f.x,f.y,f.z),p.copy(d).addScaledVector(f,r),s.push(p.x,p.y,p.z)}};for(let e=0;e<t;e++)m(e);m(a===!1?t:0);for(let e=0;e<=t;e++)for(let n=0;n<=i;n++)l.push(e/t,n/i);for(let e=1;e<=t;e++)for(let t=1;t<=i;t++){let n=i+1,r=n*(e-1)+(t-1),a=n*e+(t-1),o=n*e+t,s=n*(e-1)+t;u.push(r,a,s,a,o,s)}this.setIndex(u),this.setAttribute(`position`,new I(s,3)),this.setAttribute(`normal`,new I(c,3)),this.setAttribute(`uv`,new I(l,2))}},X=new n;function Z(e,t,n,r,i,a){let o=2*Math.PI*i/4,s=Math.max(a-2*i,0),c=Math.PI/4;X.copy(t),X[r]=0,X.normalize();let l=.5*o/(o+s),u=1-X.angleTo(e)/c;return Math.sign(X[n])===1?u*l:s/(o+s)+l+l*(1-u)}var Be=class extends Ee{constructor(e=1,t=1,r=1,i=2,a=.1){if(i=i*2+1,a=Math.min(e/2,t/2,r/2,a),super(1,1,1,i,i,i),this.type=`RoundedBoxGeometry`,this.parameters={width:e,height:t,depth:r,segments:i,radius:a},i===1)return;let o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;let s=new n,c=new n,l=new n,u=new n(e,t,r).divideScalar(2).subScalar(a),d=this.attributes.position.array,f=this.attributes.normal.array,p=this.attributes.uv.array,m=d.length/3/6,h=.5/i;for(let n=0,i=0;n<d.length/3;n++,i+=3){s.fromArray(d,i),c.copy(s),c.x-=Math.sign(c.x)*h,c.y-=Math.sign(c.y)*h,c.z-=Math.sign(c.z)*h,c.normalize(),d[i]=u.x*Math.sign(s.x)+c.x*a,d[i+1]=u.y*Math.sign(s.y)+c.y*a,d[i+2]=u.z*Math.sign(s.z)+c.z*a,f[i]=c.x,f[i+1]=c.y,f[i+2]=c.z;let o=n*2;switch(Math.floor(n/m)){case 0:l.set(1,0,0),p[o]=Z(l,c,`z`,`y`,a,r),p[o+1]=1-Z(l,c,`y`,`z`,a,t);break;case 1:l.set(-1,0,0),p[o]=1-Z(l,c,`z`,`y`,a,r),p[o+1]=1-Z(l,c,`y`,`z`,a,t);break;case 2:l.set(0,1,0),p[o]=1-Z(l,c,`x`,`z`,a,e),p[o+1]=Z(l,c,`z`,`x`,a,r);break;case 3:l.set(0,-1,0),p[o]=1-Z(l,c,`x`,`z`,a,e),p[o+1]=1-Z(l,c,`z`,`x`,a,r);break;case 4:l.set(0,0,1),p[o]=1-Z(l,c,`x`,`y`,a,e),p[o+1]=1-Z(l,c,`y`,`x`,a,t);break;case 5:l.set(0,0,-1),p[o]=Z(l,c,`x`,`y`,a,e),p[o+1]=1-Z(l,c,`y`,`x`,a,t)}}}};function Ve(e){let t=e[0],n=t.array.constructor,r=t.itemSize,i=t.normalized,a=0;for(let t of e){if(t.array.constructor!==n||t.itemSize!==r||t.normalized!==i)return console.error(`mergeAttributes(): attributes differ in array type, itemSize or normalized.`),null;a+=t.count*r}let o=new n(a),s=0;for(let t of e){if(t.isInterleavedBufferAttribute)for(let e=0;e<t.count;e++)for(let n=0;n<r;n++)o[s+e*r+n]=t.array[t._idx(e,n)];else o.set(t.array.subarray(0,t.count*r),s);s+=t.count*r}let c=new F(o,r,i);return c.gpuType=t.gpuType===void 0?c.gpuType:t.gpuType,c}function He(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i={},a=new U,o=0;for(let s=0;s<e.length;s++){let c=e[s];if(n!==(c.index!==null))return console.error(`mergeGeometries(): geometry ${s} index mismatch; all or none must be indexed.`),null;let l=0;for(let e in c.attributes){if(!r.has(e))return console.error(`mergeGeometries(): geometry ${s} has attribute "${e}" missing from geometry 0.`),null;(i[e]||=[]).push(c.attributes[e]),l++}if(l!==r.size)return console.error(`mergeGeometries(): geometry ${s} is missing attributes.`),null;if(t){let e=n?c.index.count:c.attributes.position.count;a.addGroup(o,e,s),o+=e}}if(n){let t=0,n=[];for(let r of e){let e=r.index;for(let r=0;r<e.count;r++)n.push(e.getX(r)+t);t+=r.attributes.position.count}a.setIndex(n)}for(let e in i){let t=Ve(i[e]);if(!t)return console.error(`mergeGeometries(): failed merging attribute "${e}".`),null;a.setAttribute(e,t)}let s=e.map(e=>e.userData).filter(e=>e&&Object.keys(e).length);return s.length&&(a.userData.mergedUserData=s),a}var Q=new p({name:`common`,code:`
const PI: f32 = 3.141592653589793;
const TWO_PI: f32 = 6.283185307179586;
const INV_PI: f32 = 0.3183098861837907;
const EPS: f32 = 1e-5;

fn sat( x: f32 ) -> f32 { return clamp( x, 0.0, 1.0 ); }
fn sat3( x: vec3f ) -> vec3f { return clamp( x, vec3f( 0.0 ), vec3f( 1.0 ) ); }
fn pow2( x: f32 ) -> f32 { return x * x; }
fn pow4( x: f32 ) -> f32 { let y = x * x; return y * y; }
fn pow5( x: f32 ) -> f32 { let y = x * x; return y * y * x; }
fn luminance( c: vec3f ) -> f32 { return dot( c, vec3f( 0.2126, 0.7152, 0.0722 ) ); }
fn remap( x: f32, a: f32, b: f32, c: f32, d: f32 ) -> f32 { return c + ( x - a ) * ( d - c ) / ( b - a ); }
fn remapClamp( x: f32, a: f32, b: f32, c: f32, d: f32 ) -> f32 { return mix( c, d, sat( ( x - a ) / ( b - a ) ) ); }
fn rotate2( v: vec2f, a: f32 ) -> vec2f { let c = cos( a ); let s = sin( a ); return vec2f( c * v.x - s * v.y, s * v.x + c * v.y ); }

// ---- depth (reversed-Z: 1 at the near plane, 0 at far / infinity)

// positive view-space distance along the view axis from a depth-buffer value
fn viewDepth( d: f32 ) -> f32 {
	let v = frame.invProj * vec4f( 0.0, 0.0, d, 1.0 );
	return - v.z / v.w;
}

// uv (0..1, y down) + depth -> world / view position
fn ndcFromUv( uv: vec2f, d: f32 ) -> vec4f { return vec4f( uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, d, 1.0 ); }
fn worldFromDepth( uv: vec2f, d: f32 ) -> vec3f {
	let p = frame.invViewProj * ndcFromUv( uv, d );
	return p.xyz / p.w;
}
fn viewFromDepth( uv: vec2f, d: f32 ) -> vec3f {
	let p = frame.invProj * ndcFromUv( uv, d );
	return p.xyz / p.w;
}
// world direction of the camera ray through uv
fn viewRay( uv: vec2f ) -> vec3f {
	let p = frame.invViewProj * ndcFromUv( uv, 0.5 );
	return normalize( p.xyz / p.w - frame.cameraPos );
}
// world position -> uv (y down) and depth
fn projectToUv( P: vec3f ) -> vec3f {
	let c = frame.viewProjNoJitter * vec4f( P, 1.0 );
	let n = c.xyz / c.w;
	return vec3f( n.x * 0.5 + 0.5, 0.5 - n.y * 0.5, n.z );
}
fn isSky( d: f32 ) -> bool { return d <= 0.0; }

// ---- hashes

fn pcg( v: u32 ) -> u32 {
	let state = v * 747796405u + 2891336453u;
	let word = ( ( state >> ( ( state >> 28u ) + 4u ) ) ^ state ) * 277803737u;
	return ( word >> 22u ) ^ word;
}
fn pcg3( v0: vec3u ) -> vec3u {
	var v = v0 * 1664525u + 1013904223u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	v ^= v >> vec3u( 16u );
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	return v;
}
fn u32ToUnit( h: u32 ) -> f32 { return f32( h >> 8u ) * ( 1.0 / 16777216.0 ) + ( 0.5 / 16777216.0 ); }
// float hash in [0, 1) of a float seed (TSL hash())
fn hash11( p: f32 ) -> f32 { return u32ToUnit( pcg( bitcast<u32>( p ) ^ 0x9e3779b9u ) ); }
fn hash21( p: vec2f ) -> f32 { return u32ToUnit( pcg( bitcast<u32>( p.x ) ^ pcg( bitcast<u32>( p.y ) ) ) ); }
fn hash31( p: vec3f ) -> f32 { return u32ToUnit( pcg3( bitcast<vec3u>( p ) ).x ); }
fn hash22( p: vec2f ) -> vec2f {
	let h = pcg3( vec3u( bitcast<vec2u>( p ), 0x51ed270bu ) );
	return vec2f( u32ToUnit( h.x ), u32ToUnit( h.y ) );
}
fn hash33( p: vec3f ) -> vec3f {
	let h = pcg3( bitcast<vec3u>( p ) );
	return vec3f( u32ToUnit( h.x ), u32ToUnit( h.y ), u32ToUnit( h.z ) );
}
fn hashU( a: u32, b: u32 ) -> f32 { return u32ToUnit( pcg( a ^ pcg( b ) ) ); }
fn ihash3( p: vec3i ) -> vec3u { return pcg3( bitcast<vec3u>( p ) ); }

// Jimenez interleaved gradient noise at a pixel (0..1)
fn interleavedGradientNoise( px: vec2f ) -> f32 { return fract( 52.9829189 * fract( dot( px, vec2f( 0.06711056, 0.00583715 ) ) ) ); }

// i-th of n points of a Vogel disc (unit radius), rotated by phi
fn vogelDiskSample( i: i32, n: i32, phi: f32 ) -> vec2f {
	let r = sqrt( ( f32( i ) + 0.5 ) / f32( n ) );
	let theta = f32( i ) * 2.399963229728653 + phi;
	return vec2f( cos( theta ), sin( theta ) ) * r;
}

// ---- gradient noise: MaterialX (three's MaterialXNoise.js) bit for bit — the same Jenkins
// lookup3 hash, gradients, quintic fade and gradient scales (0.6616 in 2D, 0.982 in 3D), so the
// procedural patterns land where they did in the three.js version.

fn _mxRotl( x: u32, k: u32 ) -> u32 { return ( x << k ) | ( x >> ( 32u - k ) ); }
fn _mxFinal( a0: u32, b0: u32, c0: u32 ) -> u32 {
	var a = a0; var b = b0; var c = c0;
	c ^= b; c -= _mxRotl( b, 14u );
	a ^= c; a -= _mxRotl( c, 11u );
	b ^= a; b -= _mxRotl( a, 25u );
	c ^= b; c -= _mxRotl( b, 16u );
	a ^= c; a -= _mxRotl( c, 4u );
	b ^= a; b -= _mxRotl( a, 14u );
	c ^= b; c -= _mxRotl( b, 24u );
	return c;
}
fn mxHash2( x: i32, y: i32 ) -> u32 { let s = 0xdeadbeefu + ( 2u << 2u ) + 13u; return _mxFinal( s + u32( x ), s + u32( y ), s ); }
fn mxHash3( x: i32, y: i32, z: i32 ) -> u32 { let s = 0xdeadbeefu + ( 3u << 2u ) + 13u; return _mxFinal( s + u32( x ), s + u32( y ), s + u32( z ) ); }
fn _mxGrad2( hash: u32, x: f32, y: f32 ) -> f32 {
	let h = hash & 7u;
	let u = select( y, x, h < 4u );
	let v = 2.0 * select( x, y, h < 4u );
	return select( u, - u, ( h & 1u ) != 0u ) + select( v, - v, ( h & 2u ) != 0u );
}
fn _gradDot3( h: u32, p: vec3f ) -> f32 {
	let hh = h & 15u;
	let u = select( p.y, p.x, hh < 8u );
	let v = select( select( p.z, p.x, hh == 12u || hh == 14u ), p.y, hh < 4u );
	return select( u, - u, ( hh & 1u ) != 0u ) + select( v, - v, ( hh & 2u ) != 0u );
}
fn _fade3( t: vec3f ) -> vec3f { return t * t * t * ( t * ( t * 6.0 - 15.0 ) + 10.0 ); }
fn _h3( i: vec3i ) -> u32 { return mxHash3( i.x, i.y, i.z ); }

fn perlin3( p: vec3f ) -> f32 {
	let fl = floor( p );
	let i = vec3i( fl );
	let f = p - fl;
	let u = _fade3( f );
	let n000 = _gradDot3( _h3( i ), f );
	let n100 = _gradDot3( _h3( i + vec3i( 1, 0, 0 ) ), f - vec3f( 1.0, 0.0, 0.0 ) );
	let n010 = _gradDot3( _h3( i + vec3i( 0, 1, 0 ) ), f - vec3f( 0.0, 1.0, 0.0 ) );
	let n110 = _gradDot3( _h3( i + vec3i( 1, 1, 0 ) ), f - vec3f( 1.0, 1.0, 0.0 ) );
	let n001 = _gradDot3( _h3( i + vec3i( 0, 0, 1 ) ), f - vec3f( 0.0, 0.0, 1.0 ) );
	let n101 = _gradDot3( _h3( i + vec3i( 1, 0, 1 ) ), f - vec3f( 1.0, 0.0, 1.0 ) );
	let n011 = _gradDot3( _h3( i + vec3i( 0, 1, 1 ) ), f - vec3f( 0.0, 1.0, 1.0 ) );
	let n111 = _gradDot3( _h3( i + vec3i( 1, 1, 1 ) ), f - vec3f( 1.0, 1.0, 1.0 ) );
	let x0 = mix( mix( n000, n100, u.x ), mix( n010, n110, u.x ), u.y );
	let x1 = mix( mix( n001, n101, u.x ), mix( n011, n111, u.x ), u.y );
	return mix( x0, x1, u.z ) * 0.982;
}
fn perlin2( p: vec2f ) -> f32 {
	let fl = floor( p );
	let X = i32( fl.x ); let Y = i32( fl.y );
	let fx = p.x - fl.x; let fy = p.y - fl.y;
	let u = _fade3( vec3f( fx, fy, 0.0 ) );
	let v0 = _mxGrad2( mxHash2( X, Y ), fx, fy );
	let v1 = _mxGrad2( mxHash2( X + 1, Y ), fx - 1.0, fy );
	let v2 = _mxGrad2( mxHash2( X, Y + 1 ), fx, fy - 1.0 );
	let v3 = _mxGrad2( mxHash2( X + 1, Y + 1 ), fx - 1.0, fy - 1.0 );
	let s1 = 1.0 - u.x;
	return ( ( 1.0 - u.y ) * ( v0 * s1 + v1 * u.x ) + u.y * ( v2 * s1 + v3 * u.x ) ) * 0.6616;
}
fn mx_noise_float3( p: vec3f ) -> f32 { return perlin3( p ); }
fn mx_noise_float2( p: vec2f ) -> f32 { return perlin2( p ); }
// MaterialX vec3 noise: one hash per corner, its three low bytes pick the gradients
fn _mxGrad3v( h: u32, p: vec3f ) -> vec3f { return vec3f( _gradDot3( h & 0xffu, p ), _gradDot3( ( h >> 8u ) & 0xffu, p ), _gradDot3( ( h >> 16u ) & 0xffu, p ) ); }
fn mx_noise_vec3( p: vec3f ) -> vec3f {
	let fl = floor( p );
	let i = vec3i( fl );
	let f = p - fl;
	let u = _fade3( f );
	let n000 = _mxGrad3v( _h3( i ), f );
	let n100 = _mxGrad3v( _h3( i + vec3i( 1, 0, 0 ) ), f - vec3f( 1.0, 0.0, 0.0 ) );
	let n010 = _mxGrad3v( _h3( i + vec3i( 0, 1, 0 ) ), f - vec3f( 0.0, 1.0, 0.0 ) );
	let n110 = _mxGrad3v( _h3( i + vec3i( 1, 1, 0 ) ), f - vec3f( 1.0, 1.0, 0.0 ) );
	let n001 = _mxGrad3v( _h3( i + vec3i( 0, 0, 1 ) ), f - vec3f( 0.0, 0.0, 1.0 ) );
	let n101 = _mxGrad3v( _h3( i + vec3i( 1, 0, 1 ) ), f - vec3f( 1.0, 0.0, 1.0 ) );
	let n011 = _mxGrad3v( _h3( i + vec3i( 0, 1, 1 ) ), f - vec3f( 0.0, 1.0, 1.0 ) );
	let n111 = _mxGrad3v( _h3( i + vec3i( 1, 1, 1 ) ), f - vec3f( 1.0, 1.0, 1.0 ) );
	let x0 = mix( mix( n000, n100, u.x ), mix( n010, n110, u.x ), u.y );
	let x1 = mix( mix( n001, n101, u.x ), mix( n011, n111, u.x ), u.y );
	return mix( x0, x1, u.z ) * 0.982;
}
fn mx_fractal_noise_float3( p: vec3f, octaves: i32, lacunarity: f32, diminish: f32 ) -> f32 {
	var r = 0.0; var amp = 1.0; var q = p;
	for ( var i = 0; i < octaves; i++ ) { r += amp * perlin3( q ); amp *= diminish; q *= lacunarity; }
	return r;
}
fn mx_cell_noise_float3( p: vec3f ) -> f32 { let i = vec3i( floor( p ) ); return f32( mxHash3( i.x, i.y, i.z ) ) / f32( 0xffffffffu ); }
fn mx_cell_noise_float2( p: vec2f ) -> f32 { let i = vec2i( floor( p ) ); return f32( mxHash2( i.x, i.y ) ) / f32( 0xffffffffu ); }
// distances to the nearest two feature points (F1, F2), jitter 0..1
fn mx_worley_noise_vec2_3( p: vec3f, jitter: f32 ) -> vec2f {
	let i = vec3i( floor( p ) );
	let f = fract( p );
	var d1 = 1e9; var d2 = 1e9;
	for ( var z = -1; z <= 1; z++ ) { for ( var y = -1; y <= 1; y++ ) { for ( var x = -1; x <= 1; x++ ) {
		let c = vec3i( x, y, z );
		let h = ihash3( i + c );
		let o = vec3f( f32( c.x ), f32( c.y ), f32( c.z ) ) + ( vec3f( u32ToUnit( h.x ), u32ToUnit( h.y ), u32ToUnit( h.z ) ) - 0.5 ) * jitter + 0.5 - f;
		let d = dot( o, o );
		if ( d < d1 ) { d2 = d1; d1 = d; } else if ( d < d2 ) { d2 = d; }
	} } }
	return sqrt( vec2f( d1, d2 ) );
}
fn mx_worley_noise_vec2_2( p: vec2f, jitter: f32 ) -> vec2f {
	let i = vec2i( floor( p ) );
	let f = fract( p );
	var d1 = 1e9; var d2 = 1e9;
	for ( var y = -1; y <= 1; y++ ) { for ( var x = -1; x <= 1; x++ ) {
		let c = vec2i( x, y );
		let h = ihash3( vec3i( i + c, 0 ) );
		let o = vec2f( f32( c.x ), f32( c.y ) ) + ( vec2f( u32ToUnit( h.x ), u32ToUnit( h.y ) ) - 0.5 ) * jitter + 0.5 - f;
		let d = dot( o, o );
		if ( d < d1 ) { d2 = d1; d1 = d; } else if ( d < d2 ) { d2 = d; }
	} }
	return sqrt( vec2f( d1, d2 ) );
}

// ---- normals

// orthonormal basis around n (Frisvad / Duff et al.)
fn basis( n: vec3f ) -> mat3x3f {
	let s = select( -1.0, 1.0, n.z >= 0.0 );
	let a = -1.0 / ( s + n.z );
	let b = n.x * n.y * a;
	let t = vec3f( 1.0 + s * n.x * n.x * a, s * b, -s * n.x );
	let bt = vec3f( b, s + n.y * n.y * a, -n.y );
	return mat3x3f( t, bt, n );
}

// Perturb a world-space normal by a height field sampled with screen-space derivatives
// (Mikkelsen, "Bump Mapping Unparametrized Surfaces"; TSL perturbNormal equivalent).
// dhdx / dhdy: dpdx / dpdy of the height (in metres) at this pixel.
fn perturbNormalByHeight( P: vec3f, N: vec3f, dhdx: f32, dhdy: f32, strength: f32 ) -> vec3f {
	let dPdx = dpdx( P );
	let dPdy = dpdy( P );
	let r1 = cross( dPdy, N );
	let r2 = cross( N, dPdx );
	let det = dot( dPdx, r1 );
	let grad = sign( det ) * ( dhdx * r1 + dhdy * r2 ) * strength;
	return normalize( abs( det ) * N - grad );
}

// tangent-space normal map sample (xy in -1..1) applied with a derivative-based TBN
fn perturbNormalByMap( P: vec3f, N: vec3f, uv: vec2f, mapN: vec3f ) -> vec3f {
	let dp1 = dpdx( P ); let dp2 = dpdy( P );
	let duv1 = dpdx( uv ); let duv2 = dpdy( uv );
	let dp2perp = cross( dp2, N ); let dp1perp = cross( N, dp1 );
	let T = dp2perp * duv1.x + dp1perp * duv2.x;
	let B = dp2perp * duv1.y + dp1perp * duv2.y;
	let invmax = inverseSqrt( max( max( dot( T, T ), dot( B, B ) ), 1e-20 ) );
	return normalize( mat3x3f( T * invmax, B * invmax, N ) * mapN );
}

// ---- color

fn srgbToLinear( c: vec3f ) -> vec3f {
	return select( pow( ( c + 0.055 ) / 1.055, vec3f( 2.4 ) ), c / 12.92, c <= vec3f( 0.04045 ) );
}
fn linearToSrgb( c: vec3f ) -> vec3f {
	return select( 1.055 * pow( c, vec3f( 1.0 / 2.4 ) ) - 0.055, c * 12.92, c <= vec3f( 0.0031308 ) );
}
`}),Ue={hooks:{},version:0,set(e,t){this.hooks[e]=t,this.version++},modules(){return Object.values(this.hooks).filter(Boolean)}},We={directModulation:`fn hookDirectModulation( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 1.0 ); }`,ambientModulation:`fn hookAmbientModulation( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 1.0 ); }`,shadowPosition:`fn hookShadowPosition( P: vec3f, N: vec3f, pixel: vec2f ) -> vec3f { return P; }`,bounce:`fn hookBounce( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 0.0 ); }`,localLights:`fn hookLocalLights( s: Surface, P: vec3f, N: vec3f, V: vec3f, acc: ptr<function, LightAccum> ) {}`,envSpecular:`fn hookEnvSpecular( R: vec3f, roughness: f32 ) -> vec3f { let t = sat( R.y * 0.5 + 0.5 ); return mix( frame.horizonColor * 0.6, frame.skyIrradiance * PI, t ) * frame.envIntensity; }`,envDiffuse:`fn hookEnvDiffuse( N: vec3f ) -> vec3f { return mix( frame.horizonColor * 0.25, frame.skyIrradiance, N.y * 0.5 + 0.5 ) * frame.envIntensity; }`};function Ge(){let e=[];for(let t in We){let n=Ue.hooks[t];n?e.push(n):e.push(qe(t))}return e}var Ke={};function qe(e){return Ke[e]||(Ke[e]=new p({name:`hook-`+e+`-default`,deps:[$],code:We[e]}))}var Je=new u(`SunShadow`,{matrices:[`mat4x4f[4]`,[new e,new e,new e,new e]],cascades:[`vec4f[4]`,[new c,new c,new c,new c]],count:[`u32`,0],mapSize:[`f32`,2048],bias:[`f32`,2e-5],fade:[`f32`,1],pcssCascades:[`u32`,1],sunAngularDiameter:[`f32`,.00925],enabled:[`f32`,0],pad:[`f32`,0],blend:[`vec4f[4]`,[new c,new c,new c,new c]]}),Ye=null;function Xe(e){Ye=e}var Ze=new p({name:`sunShadow`,deps:[Q],uniforms:Je,uniformName:`shadowParams`,bindings:{sunShadowMap:{texture:()=>Ye,viewDimension:`2d-array`}},code:`
fn shadowCascadeOf( viewDist: f32 ) -> i32 {
	for ( var i = 0; i < i32( shadowParams.count ); i++ ) { if ( viewDist < shadowParams.cascades[ i ].x ) { return i; } }
	return -1;
}

fn _shadowTap( uv: vec2f, layer: i32, z: f32 ) -> f32 {
	return textureSampleCompareLevel( sunShadowMap, smpShadow, uv, layer, z );
}

// shadow map depth (0 near .. 1 far, standard Z) at uv
fn _shadowDepth( uv: vec2f, layer: i32 ) -> f32 {
	let dim = vec2f( textureDimensions( sunShadowMap ) );
	let px = vec2i( clamp( uv * dim, vec2f( 0.0 ), dim - 1.0 ) );
	return textureLoad( sunShadowMap, px, layer, 0 );
}

// Contact-hardening sun shadows (PCSS, the former SunShadowFilter) on the near cascades. The penumbra of a
// real sun shadow grows with the distance from the occluder to the receiver (the sun is a 0.53 deg disc):
// sharp where an object touches the ground, soft under a palm crown 10 m up. Per pixel:
//  1. blocker search: average depth of the occluders around the pixel (raw depth loads, no sampler)
//  2. penumbra width = occluder-receiver distance * sun diameter, converted to this cascade's texels
//  3. percentage-closer filtering over that width
// Both sample sets are Vogel disks rotated per pixel and per frame (interleaved gradient noise): the
// TAA resolves the noise into a smooth gradient. Farther cascades: three's PCFShadowFilter (5 Vogel taps
// of hardware comparisons over one texel, rotated per pixel).
const SHADOW_MAX_OCCLUDER_HEIGHT: f32 = 30.0; // m: search radius covers penumbrae of occluders up to this far above
const SHADOW_SEARCH_TAPS: i32 = 8;
const SHADOW_FILTER_TAPS: i32 = 12;

fn sunShadowCascade( P: vec3f, N: vec3f, c: i32, noise: f32, pcfNoise: f32 ) -> f32 {
	return _sunShadowCascade( P, N, c, noise, pcfNoise, true );
}

// pcss = false: the 5-tap PCF filter in every cascade (no blocker search)
fn _sunShadowCascade( P: vec3f, N: vec3f, c: i32, noise: f32, pcfNoise: f32, pcss: bool ) -> f32 {
	let info = shadowParams.cascades[ c ];
	let Pb = P + N * info.z;
	let sc = shadowParams.matrices[ c ] * vec4f( Pb, 1.0 );
	let uvz = vec3f( sc.x * 0.5 + 0.5, 0.5 - sc.y * 0.5, sc.z );
	if ( any( uvz.xy < vec2f( 0.0 ) ) || any( uvz.xy > vec2f( 1.0 ) ) || uvz.z > 1.0 ) { return 1.0; }
	let z = uvz.z - shadowParams.bias;
	let texel = 1.0 / shadowParams.mapSize;
	if ( pcss && u32( c ) < shadowParams.pcssCascades ) {
		// moved every frame (Jimenez 2014): a noise pattern fixed on screen would never average out
		let phi = noise * TWO_PI;
		let width = info.y * shadowParams.mapSize; // cascade width (m)
		let range = info.w; // depth range (m)
		let SD = shadowParams.sunAngularDiameter;
		// 1. blockers within the widest penumbra this cascade can show. The texel straight along the light
		// ray comes first: a thin occluder (a log, a rope, a rail) can fall between the disk taps, which
		// left lit dots inside its umbra.
		let searchUV = max( min( SHADOW_MAX_OCCLUDER_HEIGHT * SD / width, texel * 24.0 ), texel * 1.5 );
		let d0 = _shadowDepth( uvz.xy, c );
		var blockSum = select( 0.0, d0, d0 < z );
		var blockCount = select( 0.0, 1.0, d0 < z );
		for ( var i = 0; i < SHADOW_SEARCH_TAPS; i++ ) {
			let d = _shadowDepth( uvz.xy + vogelDiskSample( i, SHADOW_SEARCH_TAPS, phi ) * searchUV, c );
			// standard depth: an occluder is closer to the light = smaller depth
			if ( d < z ) { blockSum += d; blockCount += 1.0; }
		}
		if ( blockCount < 0.5 ) { return 1.0; }
		// 2. occluder-receiver distance (orthographic: depth is linear over the camera range)
		let dz = abs( blockSum / blockCount - z ) * range;
		let penumbraUV = clamp( dz * SD / width, texel * 1.2, texel * 32.0 );
		// 3. PCF over the penumbra
		var sum = 0.0;
		for ( var i = 0; i < SHADOW_FILTER_TAPS; i++ ) {
			let d = _shadowDepth( uvz.xy + vogelDiskSample( i, SHADOW_FILTER_TAPS, phi + 1.7 ) * penumbraUV, c );
			sum += select( 0.0, 1.0, z <= d );
		}
		return sum / f32( SHADOW_FILTER_TAPS );
	}
	// three's PCFShadowFilter: 5 samples on a Vogel disk of one texel, rotated per pixel
	let phiP = pcfNoise * TWO_PI;
	var sum = 0.0;
	for ( var i = 0; i < 5; i++ ) {
		sum += _shadowTap( uvz.xy + vogelDiskSample( i, 5, phiP ) * texel, c, z );
	}
	return sum / 5.0;
}

// visibility of the sun at P (1 = lit); pixel = fragment coordinate for the dither.
// Cascade seams blended over a band that grows with their distance (SoftCSMShadowNode: a quarter of it,
// 2.5 m at the 10 m seam, 15 m at 60 m, and the last cascade fades out over its final 100 m); each
// cascade's map is widened to cover its part of the overlap.
fn sunShadow( P: vec3f, N: vec3f, pixel: vec2f ) -> f32 {
	return _sunShadow( P, N, pixel, true );
}

// sunShadow with the plain 5-tap PCF filter everywhere (surfaces whose own detail hides penumbrae: water)
fn sunShadowPCF( P: vec3f, N: vec3f, pixel: vec2f ) -> f32 {
	return _sunShadow( P, N, pixel, false );
}

fn _sunShadow( P: vec3f, N: vec3f, pixel: vec2f, pcss: bool ) -> f32 {
	if ( shadowParams.enabled < 0.5 ) { return 1.0; }
	let dist = dot( P - frame.cameraPos, - vec3f( frame.view[ 0 ][ 2 ], frame.view[ 1 ][ 2 ], frame.view[ 2 ][ 2 ] ) );
	let noise = interleavedGradientNoise( pixel + f32( frame.frameIndex % 64u ) * 5.588238 );
	let pcfNoise = interleavedGradientNoise( pixel );
	if ( shadowParams.fade < 0.5 ) {
		let c = shadowCascadeOf( dist );
		if ( c < 0 ) { return 1.0; }
		return _sunShadowCascade( P, N, c, noise, pcfNoise, pcss );
	}
	var ret = 1.0;
	let last = i32( shadowParams.count ) - 1;
	for ( var i = 0; i <= last; i++ ) {
		let b = shadowParams.blend[ i ]; // x, y: cascade range, z / w: blend margin at its near / far seam
		let center = ( b.x + b.y ) * 0.5;
		let margin = max( select( b.w, b.z, dist < center ), 1e-5 );
		let csmX = b.x - margin * 0.5;
		let csmY = select( b.y + margin * 0.5, b.y, i == last );
		if ( dist >= csmX && dist <= csmY ) {
			var ratio = clamp( min( dist - csmX, csmY - dist ) / margin, 0.0, 1.0 );
			// no fade at the near edge of the first cascade
			if ( i == 0 && dist <= center ) { ratio = 1.0; }
			ret -= ( 1.0 - _sunShadowCascade( P, N, i, noise, pcfNoise, pcss ) ) * ratio;
		}
	}
	return max( ret, 0.0 );
}

// one depth comparison in cascade c (1 = lit; outside the map: lit). For volumetric marches (haze shafts,
// motes) where the jitter and the temporal resolve do the filtering.
fn sunShadowCascadeHard( P: vec3f, c: i32 ) -> f32 {
	let sc = shadowParams.matrices[ c ] * vec4f( P, 1.0 );
	let uv = vec2f( sc.x * 0.5 + 0.5, 0.5 - sc.y * 0.5 );
	if ( any( uv <= vec2f( 0.0 ) ) || any( uv >= vec2f( 1.0 ) ) || sc.z > 1.0 ) { return 1.0; }
	return select( 0.0, 1.0, sc.z - 2e-5 <= _shadowDepth( uv, c ) );
}
// same in the cascade covering P (by view distance), 1 beyond the last one or with shadows off
fn sunShadowHard( P: vec3f ) -> f32 {
	if ( shadowParams.enabled < 0.5 ) { return 1.0; }
	let dist = dot( P - frame.cameraPos, - vec3f( frame.view[ 0 ][ 2 ], frame.view[ 1 ][ 2 ], frame.view[ 2 ][ 2 ] ) );
	let c = shadowCascadeOf( dist );
	if ( c < 0 ) { return 1.0; }
	return sunShadowCascadeHard( P, c );
}
`}),$=new p({name:`surface`,deps:[Q],code:`
struct Surface {
	albedo: vec3f,
	alpha: f32,
	normal: vec3f,      // world space, shading normal
	roughness: f32,
	emissive: vec3f,
	metalness: f32,
	translucency: vec3f, // fraction of the direct light transmitted through thin foliage (x lightColor)
	ao: f32,
	sheenColor: vec3f,
	specularIntensity: f32,
	clearcoat: f32,
	clearcoatRoughness: f32,
	sheenRoughness: f32,
	ior: f32,
	clearcoatNormal: vec3f,
	envIntensity: f32,
};

fn defaultSurface( N: vec3f ) -> Surface {
	var s: Surface;
	s.albedo = vec3f( 1.0 ); s.alpha = 1.0; s.normal = N; s.roughness = 1.0; s.metalness = 0.0;
	s.emissive = vec3f( 0.0 ); s.translucency = vec3f( 0.0 ); s.ao = 1.0; s.sheenColor = vec3f( 0.0 );
	s.specularIntensity = 1.0; s.clearcoat = 0.0; s.clearcoatRoughness = 0.0; s.sheenRoughness = 1.0;
	s.ior = 1.5; s.clearcoatNormal = N; s.envIntensity = 1.0;
	return s;
}

// screen derivatives of the lit position, taken at the top of shadeSurface (every lane of the quad
// is live there; the sun hooks run in a branch, where derivatives are undefined)
var<private> lightDPdx: vec3f = vec3f( 0.0 );
var<private> lightDPdy: vec3f = vec3f( 0.0 );

struct LightAccum {
	directDiffuse: vec3f,
	directSpecular: vec3f,
	indirectDiffuse: vec3f,
	indirectSpecular: vec3f,
};

fn F_Schlick( f0: vec3f, f90: f32, dotVH: f32 ) -> vec3f {
	let fresnel = exp2( ( -5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + f90 * fresnel;
}
fn V_GGX_SmithCorrelated( alpha: f32, dotNL: f32, dotNV: f32 ) -> f32 {
	let a2 = alpha * alpha;
	let gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * dotNV * dotNV );
	let gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * dotNL * dotNL );
	return 0.5 / max( gv + gl, EPS );
}
fn D_GGX( alpha: f32, dotNH: f32 ) -> f32 {
	let a2 = alpha * alpha;
	let d = dotNH * dotNH * ( a2 - 1.0 ) + 1.0;
	return INV_PI * a2 / ( d * d );
}
fn BRDF_GGX( L: vec3f, V: vec3f, N: vec3f, f0: vec3f, f90: f32, roughness: f32 ) -> vec3f {
	let alpha = roughness * roughness;
	let H = normalize( L + V );
	let dotNL = sat( dot( N, L ) ); let dotNV = sat( dot( N, V ) );
	let dotNH = sat( dot( N, H ) ); let dotVH = sat( dot( V, H ) );
	return F_Schlick( f0, f90, dotVH ) * V_GGX_SmithCorrelated( alpha, dotNL, dotNV ) * D_GGX( alpha, dotNH );
}
// Charlie sheen (Estevez & Kulla)
fn D_Charlie( roughness: f32, dotNH: f32 ) -> f32 {
	let a = roughness * roughness;
	let invA = 1.0 / a;
	let cos2h = dotNH * dotNH;
	let sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invA ) * pow( sin2h, invA * 0.5 ) / ( 2.0 * PI );
}
fn V_Neubelt( dotNV: f32, dotNL: f32 ) -> f32 { return sat( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) ); }
fn BRDF_Sheen( L: vec3f, V: vec3f, N: vec3f, color: vec3f, roughness: f32 ) -> vec3f {
	let H = normalize( L + V );
	return color * D_Charlie( roughness, sat( dot( N, H ) ) ) * V_Neubelt( sat( dot( N, V ) ), sat( dot( N, L ) ) );
}
// analytical approximation of the split-sum DFG term (Karis)
fn DFGApprox( dotNV: f32, roughness: f32 ) -> vec2f {
	let c0 = vec4f( -1.0, -0.0275, -0.572, 0.022 );
	let c1 = vec4f( 1.0, 0.0425, 1.04, -0.04 );
	let r = roughness * c0 + c1;
	let a004 = min( r.x * r.x, exp2( -9.28 * dotNV ) ) * r.x + r.y;
	return vec2f( -1.04, 1.04 ) * a004 + r.zw;
}
// multi-scattering specular energy compensation (Fdez-Aguera), as three's computeMultiscattering
fn multiscatter( N: vec3f, V: vec3f, specColor: vec3f, specF90: f32, roughness: f32, single: ptr<function, vec3f>, multi: ptr<function, vec3f> ) {
	let fab = DFGApprox( sat( dot( N, V ) ), roughness );
	let Fr = specColor;
	let FssEss = Fr * fab.x + specF90 * fab.y;
	let Ess = fab.x + fab.y;
	let Ems = 1.0 - Ess;
	let Favg = Fr + ( 1.0 - Fr ) * 0.047619;
	let Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	*single += FssEss;
	*multi += Fms * Ems;
}
`}),Qe=new p({name:`lighting`,deps:[Q,$,Ze],code:`
// STUDIO_LIGHTING (a pass define, e.g. the fish portraits of the catch card): the world hooks are
// skipped (no shadows, caustics, cloud / hill shadow, bounce, local lights, underwater tint) and the
// environment is a neutral photo studio: a grey sweep lit from above plus one large softbox whose
// azimuth is frame.debug.x (radians, animatable). The key light is frame.sunDir / frame.sunColor of
// the view's own frame block.
fn studioEnvSpecular( R: vec3f, roughness: f32 ) -> vec3f {
	let sweep = mix( vec3f( 0.035, 0.04, 0.045 ), vec3f( 0.55, 0.57, 0.6 ), smoothstep( -0.35, 0.85, R.y ) );
	let az = atan2( R.x, R.z ) - frame.debug.x;
	let w = 0.35 + roughness * 1.6;
	let box = exp( - az * az / ( w * w ) ) * smoothstep( -0.05, 0.3, R.y ) * smoothstep( 0.98, 0.55, R.y );
	return ( sweep + box * vec3f( 2.4, 2.35, 2.25 ) / ( 1.0 + roughness * 3.0 ) ) * frame.envIntensity;
}
fn studioEnvDiffuse( N: vec3f ) -> vec3f {
	return mix( vec3f( 0.05, 0.055, 0.06 ), vec3f( 0.3, 0.31, 0.33 ), N.y * 0.5 + 0.5 ) * frame.envIntensity;
}

fn shadeSurface( s: Surface, P: vec3f, V: vec3f, pixel: vec2f ) -> vec3f {
	let N = s.normal;
	let rough = clamp( s.roughness, 0.03, 1.0 );
	let diffuseColor = s.albedo * ( 1.0 - s.metalness );
	let specF0 = mix( vec3f( 0.04 ) * s.specularIntensity, s.albedo, s.metalness );
	let specF90 = mix( s.specularIntensity, 1.0, s.metalness );
	var acc: LightAccum;
	acc.directDiffuse = vec3f( 0.0 ); acc.directSpecular = vec3f( 0.0 );
	acc.indirectDiffuse = vec3f( 0.0 ); acc.indirectSpecular = vec3f( 0.0 );

	lightDPdx = dpdx( P );
	lightDPdy = dpdy( P );

	// ---- sun / moon
	let L = frame.sunDir;
	let dotNL = sat( dot( N, L ) );
#if STUDIO_LIGHTING
	let lightColor = frame.sunColor;
#else
	// Faces turned away from the sun with no transmission get nothing from it: the modulation hooks
	// (clouds, hill shadow, caustics) and the shadow filters only run for the rest, and the filters
	// only where the hooks left light (their derivatives are taken ahead: lightDPdx / lightDPdy)
	var lightColor = vec3f( 0.0 );
	if ( dotNL > 0.0 || any( s.translucency > vec3f( 0.0 ) ) ) {
		lightColor = frame.sunColor * hookDirectModulation( P, N );
#if MATERIAL_SUN_MODULATION
		// per-material key-light multiplier (the former TerrainLightingModel: heightfield hill shadow)
		lightColor *= materialSunModulation( P, N );
#endif
		let geomN = N;
		var shadow = 0.0;
		if ( any( lightColor > vec3f( 0.0 ) ) ) {
#if REFRACTION_CLIP
			// the water's refraction source (seen blurred through the water): one hard shadow tap
			shadow = sunShadowHard( hookShadowPosition( P, geomN, pixel ) );
#else
			shadow = sunShadow( hookShadowPosition( P, geomN, pixel ), geomN, pixel );
#endif
		}
		lightColor *= shadow;
	}
#endif
	let irradiance = dotNL * lightColor;
	acc.directDiffuse += irradiance * diffuseColor * INV_PI;
	acc.directSpecular += irradiance * BRDF_GGX( L, V, N, specF0, specF90, rough );
#if SHEEN
	acc.directSpecular += irradiance * BRDF_Sheen( L, V, N, s.sheenColor, max( s.sheenRoughness, 0.07 ) );
#endif
	// thin-surface transmission (foliage): lit from behind as well
	acc.directDiffuse += s.translucency * lightColor;
#if CLEARCOAT
	let ccN = s.clearcoatNormal;
	let ccNL = sat( dot( ccN, L ) );
	let ccSpec = ccNL * lightColor * BRDF_GGX( L, V, ccN, vec3f( 0.04 ), 1.0, clamp( s.clearcoatRoughness, 0.03, 1.0 ) );
#endif

	// ---- local lights (lanterns, windows, boat lights, flashlight)
#if !STUDIO_LIGHTING
	hookLocalLights( s, P, N, V, &acc );
#endif

	// ---- indirect: environment + ground bounce
	// (three's PhysicalLightingModel: env irradiance goes through the multiscatter-compensated
	// diffuse; the ground bounce is plain Lambert)
	let R = reflect( -V, N );
	let Rr = normalize( mix( R, N, rough * rough ) );
#if STUDIO_LIGHTING
	let envIrr = studioEnvDiffuse( N ) * PI * s.envIntensity;
	let radiance = studioEnvSpecular( Rr, rough ) * s.envIntensity;
#else
	let envIrr = hookEnvDiffuse( N ) * PI * s.envIntensity;
	let radiance = hookEnvSpecular( Rr, rough ) * s.envIntensity;
#endif
	var single = vec3f( 0.0 ); var multi = vec3f( 0.0 );
	multiscatter( N, V, specF0, specF90, rough, &single, &multi );
	let totalScatter = single + multi;
	let diffuseMS = diffuseColor * ( 1.0 - max( max( totalScatter.r, totalScatter.g ), totalScatter.b ) );
	acc.indirectSpecular += radiance * single + multi * envIrr * INV_PI;
#if STUDIO_LIGHTING
	acc.indirectDiffuse += diffuseMS * envIrr * INV_PI;
#else
	acc.indirectDiffuse += diffuseMS * envIrr * INV_PI + hookBounce( P, N ) * diffuseColor;
#endif

	// ambient occlusion (specular occlusion after Lagarde)
	let dotNV = sat( dot( N, V ) );
	let specAO = sat( pow( dotNV + s.ao, exp2( -16.0 * rough - 1.0 ) ) - 1.0 + s.ao );
	acc.indirectDiffuse *= s.ao;
	acc.indirectSpecular *= specAO;
#if STUDIO_LIGHTING
	let amb = vec3f( 1.0 );
#else
	let amb = hookAmbientModulation( P, N );
#endif
	acc.indirectDiffuse *= amb;
	acc.indirectSpecular *= amb;

	var color = acc.directDiffuse + acc.directSpecular + acc.indirectDiffuse + acc.indirectSpecular;
#if SHEEN
	color += s.sheenColor * envIrr * INV_PI * 0.5 * s.ao * amb;
#endif
#if CLEARCOAT
	let ccNV = sat( dot( ccN, V ) );
	let Fcc = F_Schlick( vec3f( 0.04 ), 1.0, ccNV ) * s.clearcoat;
#if STUDIO_LIGHTING
	let ccRad = studioEnvSpecular( reflect( -V, ccN ), clamp( s.clearcoatRoughness, 0.03, 1.0 ) ) * amb * specAO;
#else
	let ccRad = hookEnvSpecular( reflect( -V, ccN ), clamp( s.clearcoatRoughness, 0.03, 1.0 ) ) * amb * specAO;
#endif
	color = color * ( 1.0 - Fcc ) + ( ccSpec * s.clearcoat + ccRad * Fcc );
#endif
	return color + s.emissive;
}
`});export{ue as A,ye as C,F as D,ge as E,ae as F,M as I,re as L,z as M,ce as N,I as O,le as P,j as R,Ce as S,U as T,Me as _,Xe as a,je as b,Q as c,ze as d,Re as f,Oe as g,ke as h,Qe as i,R as j,L as k,He as l,Ae as m,Je as n,Ze as o,Ee as p,Ge as r,$ as s,Ue as t,Be as u,Te as v,W as w,we as x,De as y};