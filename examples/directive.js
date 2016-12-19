// fix for IE
// if(!Object.assign){
//   Object.assign = function(a0, a1){
//     for(var name in a1){
//       if(a1.hasOwnProperty(name)){
//         a0[name] = a1[name];
//       }
//     }
//     return a0;
//   }
// }

var requestAnimationFrame = window.requestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.msRequestAnimationFrame;

angular.module('relationCircle', [])

// scope:
// = is for two-way binding
// @ simply reads the value (one-way binding)
// & is used to bind functions
.directive('relationCircle', function(){

var ci=0, colorPreset = [ '#EC7063', '#A569BD', '#F4D03F', '#5DADE2', '#45B39D', '#F5B041', '#58D68D', '#6B96F7', '#DC7633', '#DE9FF1', '#7BCCDD' ];
function randomColor(){
  if( ++ci >= colorPreset.length ){ ci = 0 }
  return colorPreset[ci];
  // return '#'+Math.random().toString(16).substr(2,6);
}

var _elementIdCounter=0;

return {
    restrict:'E',
    replace: true,
    // scope: true,
    scope: {
      size:'=',               // {number} size in px. default: 500
      data:'=',               // {} - data. see {@link dataExample}
      // filter:'=',             // {string} nodeId - show only selected nodes and it's relations
      // filterDirection:'='     // {'one'|'two'}
      autoCleanUp:'='     // {boolean} default:true
    },
    template: '<div id="drawing">'
              +'<div class="bc_popup_anchor"></div>'
              +'</div>',
    controllerAs: 'ctl',
    controller: function relationCircleController($scope, $element, $attrs, $transclude, $rootScope){
      var ctrl = this;
      var size = $scope.size = $scope.size || 500;
      var autoCleanUp = typeof $scope.autoCleanUp !== "undefined" ? $scope.autoCleanUp : true;
      // var filter = $scope.filter || null;


      //
      var bg_border_w = 4;
      // var item_border_w = 3;
      var item_r0 = 1;
      var item_r = 15;

      var line_padding = 2;
      var line_width = 5;
      var animation_time = '1s';

      var bgnd_c_center = parseInt(size/2);
      var bgnd_c_radius = parseInt(bgnd_c_center-4*item_r); // '4' - some experimental value =)

      /**
       * @type {bolean}
       */
      var _firstrun = true;

      /**
       * Link to main svg object
       * @type {SVG}
       */
      ctrl.svg = null;

      /**
       * @typedef {object} NodeInfo
       * @property {string} id
       * @property {number} [value] - node weight
       * @property {string} [color]
       * @property {SVG} [_svg] - link to svg element
       */

      /**
       * @typedef {object} LinkInfo
       * @property {string} from - source node id
       * @property {string} to   - destination node id
       * @property {number} [value] - link weight
       * @property {string} [color] -link color. default - same as source color
       * @property {SVG} [_svg] - link to svg element
       */



      /**
       * Nodes
       * @type {Object<NodeInfo>}
       */
      ctrl.nodes = {};


      /**
       * Linkes array
       * @type {Aray<LinkInfo>}
       */
      ctrl.links = [];

      /**
       * Linkes object
       * @type {Object<Object<LinkInfo>>} from => to => LinkInfo
       */
      ctrl._linksIndex = {};

      ctrl._elementIdNum = null;

      init();
      /////////////////


      /**
       *
       */
      function init(){
        ctrl._elementIdNum = _elementIdCounter++;

        $element.attr({id: 'drawing'+ctrl._elementIdNum });
        $element.css({height: size, width:size, position: 'relative'});

        // create main svg drawing
        ctrl.svg = SVG('drawing'+ctrl._elementIdNum);

        // background circle
        ctrl._svg = ctrl.svg.circle(2*bgnd_c_radius).attr({
            'fill-opacity': 0,
            'stroke-width': bg_border_w,
            'stroke':'#000'
          })
          .move(bgnd_c_center - bgnd_c_radius, bgnd_c_center - bgnd_c_radius);

        // bind tooltip
        if( $().tooltip ){
          // show tooltip on hover

          $element.on('mouseover', function(e){
            console.log('mouseover', e.target, e);
            if(e.target._svg_original){
              showTooltip(e.target._svg_original, e.offsetX, e.offsetY);
            }
          });

          $element.on('mouseout', function(e){
            // if(e.target === e.currentTarget){
            if(e.target._svg_original){
              hideTooltip(e.target._svg_original);
            }
          });
        }
      }

      /**
       * @param {SVG} node
       */
      function showTooltip(node, x, y){
          console.log('showTooltip', node);
          var text='';
          var pos=null;

          if(typeof node.id !== "undefined"){
            // this is node, not a link
            var outCount = Object.keys(ctrl._linksIndex[node.id]||[]).length;
            var inCount = (ctrl.links||[]).reduce(function(sum, c){
              return sum + (c.to == node.id ? 1 : 0);
            }, 0);

            text = 'ID:&nbsp;' + node.id
                 // + '<br>Value:&nbsp;'+node.value
                 + '<br>' + 'Links outbound:&nbsp;' + outCount
                 + '<br>' + 'Links inbound:&nbsp;' + inCount ;

            pos = {
              x : node.pos.x,
              y : node.pos.y-item_r
            };

          }else{
            // assume it's a link
            text = 'From&nbsp;{from}&nbsp;to&nbsp;{to}'.replace('{from}', node.from).replace('{to}', node.to)
                 + '<br>Value:&nbsp;' + (node.value || 'N/A');

            // pos = orto_projection(node.line[0], node.line[1], {x:x, y:y});
            pos = {
              x : node.line[0].x + (node.line[1].x - node.line[0].x)/2,
              y : node.line[0].y + (node.line[1].y - node.line[0].y)/2
            };

            // pos = {
            //   x : x,
            //   y : y
            // };
          }

          $element.find('.bc_popup_anchor').css({height:0, width:0, position:'absolute', left: pos.x, top: pos.y })
          // .tooltip('destroy')
            .tooltip({title:text, html:true, animation:false}).tooltip('show');
          // $('svg circle:first').tooltip({title:'test'}).tooltip('show')
      }

      /**
       * @param {SVG} node (unused)
       */
      function hideTooltip(/*node*/){
        $element.find('.bc_popup_anchor').tooltip('destroy');
      }

      // /**
      //  *
      //  */
      // $scope.$watch('filter', function(){
      //   console.log('Apply filter: NODE_ID=%s', $scope.filter);
      //   _update();
      // });



      /**
       * Assume data is a list of links
       */
      $scope.$watchCollection('data', function(){
        var links = $scope.data || [];
        console.log('$scope.data');
        console.dir(links);


        // validate
        links = links.filter(function(link){
          if(typeof link.from === "undefined"){
            console.warn('Link "from" must be set:', link);
            return false;
          }

          if(typeof link.to === "undefined"){
            console.warn('Link "to" must be set:', link);
            return false;
          }

          return true;
        });


        // var newNodes = {};
        var newLinks = [];
        var newLinksIndex = {};

        links.forEach(function(link){

          // process & update nodes
          ctrl.nodes[link.from] = ctrl.nodes[link.from] || {
            id: link.from,
            value:0,
            color: link.color || randomColor()
          };

          ctrl.nodes[link.to] = ctrl.nodes[link.to] || {
            id: link.to,
            value:0,
            color: randomColor()
          };
        });


        // process links
        links.forEach(function(link){

          // check for duplication
          var duplicationlinkItem = (newLinksIndex[link.from] || {})[link.to] || null;
          if(duplicationlinkItem){
            console.warn('Duplicated link:', link);
            // just sum up values
            duplicationlinkItem.value = (duplicationlinkItem.value || 0) + (link.value || 0);
            return;

          }

          // check for opposite directed link
          var reverselinkItem = (newLinksIndex[link.to] || {})[link.from] || null;
          if(reverselinkItem){
            console.warn('Reversed link:', link);
            // just sum up values
            reverselinkItem.value = (reverselinkItem.value || 0) - (link.value || 0);
            if( reverselinkItem.value === 0){
              // links eliminated
              delete newLinksIndex[link.to][link.from];
              return;

            }else if( reverselinkItem.value < 0){
              // link reverted. delete current and create new one
              delete newLinksIndex[link.to][link.from];
              var idx = newLinks.indexOf(reverselinkItem);
              if(idx>=0){
                newLinks.splice(idx, 1);
              }
            }
          }

          // create new link
          var linkItem = (ctrl._linksIndex[link.from] || {})[link.to] || {};
          Object.assign(linkItem, link); // copy all properties. don't erase already existed

          _addToIndex(linkItem, newLinksIndex);
          newLinks.push(linkItem);

        });

        var diffLinks = _diff(ctrl.links, newLinks);

        // update
        // ctrl.nodes = newNodes;
        ctrl.links = newLinks;
        ctrl._linksIndex = newLinksIndex;

        // update coresponding svg elements
        // nodes
        Object.keys(ctrl.nodes).forEach(function(id){
          if(!ctrl.nodes[id]._svg){
            // seems like it's a new element
            createNode(ctrl.nodes[id]);
          }
        });

        // diffNodes.add.forEach(function(nodeId){
        //   createNode( newNodes[nodeId] );
        // });
        // if(autoCleanUp){
        //   diffLinks.remove.forEach(function(nodeId){
        //     removeNode(ctrl.nodes[nodeId]);
        //   });
        // }



        // links
        diffLinks.add.forEach(function(link){
          createLink( link );
        });
        diffLinks.remove.forEach(function(link){
          removeLink(link);
        });

        // _update();
        requestAnimationFrame(_update);
      });

      /**
       * @param {LinkInfo} link
       * @param {Object<Object<LinkInfo>>} indexObj
       */
      function _addToIndex(link, indexObj){
        indexObj[link.from] = indexObj[link.from] || {};
        indexObj[link.from][link.to] = indexObj[link.from][link.to] || link;
      }


      /**
       * @param {Array} from - array with old data
       * @param {Array} to - array with new data
       */
      function _diff(from, to){
          return {
              add: to.filter(function(item){ return from.indexOf(item)<0; }),
              remove:  from.filter(function(item){ return to.indexOf(item)<0; })
          };
      }


      /**
       * add svg link figure
       */
      function createLink(link){
          console.log('createLink', link);

          // TODO: get real nodes position
          var source = ctrl.nodes[link.from] /*|| targetCenter*/;
          if(!source){
            console.warn('Link "from" node not found:', link);
            return;
          }
          var target = ctrl.nodes[link.to] /*|| targetCenter*/;
          if(!target){
            console.warn('Link "to" node not found:', link);
            return;
          }

          var sp = {
            x: source.pos.x,
            y: source.pos.y,
          };
          sp = css_get_position(source._svg.node);
          var tp = {
            x: target.pos.x,
            y: target.pos.y,
          };
          tp = css_get_position(target._svg.node);

          // me.loan[tid].svg = ctrl.svg.path(['M', me.pos.x, me.pos.y, 'L', target.pos.x, target.pos.y].join(' '))
          // link._svg = ctrl.svg.polyline([[sp.x, sp.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/, [tp.x, tp.y]])

          // link._svg = ctrl.svg.line(sp.x, sp.y, tp.x, tp.y)

          // we use css transitions to place this lineproperly
          // link._svg = ctrl.svg.line(0,0, bgnd_c_radius, 0)
          link._svg = ctrl.svg.rect(bgnd_c_radius, line_width)
            .back()
            // .backward()
            // .after( $element.children('circle:last').get(0) )
            .attr({
              'fill-opacity': 0.7,
              // 'stroke-opacity': 0.7,
              'stroke-width': line_padding*2,
              // 'stroke': _firstrun ? me.color : '#0F0'
              'fill': link.color || source.color,
              'stroke':'transparent'
            });
          link._svg.attr({
              style: css_style({
                transform: myline(sp.x, sp.y, tp.x, tp.y, link._svg),
                transition: 'all linear '+animation_time,
                // 'transform-origin': 'left center'
                'transform-origin': '0 0'
              })
            });
            // if(!_firstrun){
            //   me.loan[to].svg.animate().attr({'stroke': me.color});
            // }

          ctrl._svg.back();


          link.line = [sp, tp];
          // setTimeout(removeLink.bind(this, from, to), 2000); // DEBUG

          // link back to object
          link._svg.node._svg_original = link;
      }


      /**
       *
       */
      function removeLink(link){
        console.log('removeLink', link);
        _animateRemove( link._svg );
      }


      function _animateRemove(svgElement, cb){
        var fx = svgElement
          .animate()
          .attr({'stroke':'#F00', 'fill':'#F00'})
          .delay(2000)
          .animate(700, '>')
          .attr({ 'stroke-opacity': 0.0 });

        if( svgElement instanceof SVG.Circle){
          fx = fx.attr({r:item_r0});
        }
        fx.after(function(){
          svgElement.remove();
          cb && cb();
        });
      }


      /**
       *
       */
      function polar(i, n){
        var a;
        if(n<=1){
          a = 0;
        }else{
          a = 2*Math.PI*i/n + Math.PI/2;
        }

        return {
          x : bgnd_c_center + bgnd_c_radius * Math.sin(a),
          y : bgnd_c_center - bgnd_c_radius * Math.cos(a)
        };
      }




      var targetCenter = {pos:{x:bgnd_c_center, y:bgnd_c_center}};


      /**
       *
       */
      function createNode(node){
        console.log('createNode', node);


        // body
        var me = node;
        // me.pos = polarEntry();
        var ids = Object.keys(ctrl.nodes);
        me.pos = polar(ids.indexOf(""+node.id), ids.length);

        // me.color = randomColor();
        me._svg = ctrl.svg.circle(2*item_r0).attr({
            'stroke-width': 1, //item_border_w,
            // 'stroke':'#F33'
            'stroke': me.color,
            'fill': me.color,
            style: css_style({
              transform: css_translate(me.pos.x, me.pos.y),
              transition: 'all linear '+animation_time
            })
          })
          //.move(me.pos.x-item_r0, me.pos.y-item_r0);

        me._svg.animate(300, '<')
          .attr({
            r:item_r
          })
          // .move(me.pos.x-item_r, me.pos.y-item_r);

        // link back to object
        me._svg.node._svg_original = me;

      }

      /**
       *
       */
      function removeNode(node){
        _animateRemove(node._svg);
      }


      // recalculate elements position
      function _update(isAnimated){
          console.log('_update');
          console.dir(ctrl);
          if(typeof isAnimated === 'undefined'){
            isAnimated = !_firstrun;
          }

          var nodesCount = Object.keys(ctrl.nodes).length;
          Object.keys(ctrl.nodes).forEach(function(id, i){
            var me = ctrl.nodes[id];
            me.pos = polar(i, nodesCount);

            // body
            // if(isAnimated){
            //   ctrl.nodes[id]._svg.animate().move(me.pos.x-item_r, me.pos.y-item_r);
            // }else{
            //   ctrl.nodes[id]._svg.move(me.pos.x-item_r, me.pos.y-item_r);
            // }

            me._svg.attr({
              style: css_style({
                transform: css_translate(me.pos.x, me.pos.y),
                transition: 'all linear '+animation_time
              })
            });

            // filter
            if($scope.filter!==null && $scope.filter!==undefined && $scope.filter !== id){
              me._svg.hide();
            }else{
              me._svg.show();
            }

          });

          // links
          ctrl.links.forEach(function(link, i){
              var source = ctrl.nodes[link.from] /*|| targetCenter*/;
              if(!source){
                console.warn('Link "from" node not found:', link);
                return;
              }
              var target = ctrl.nodes[link.to] /*|| targetCenter*/;
              if(!target){
                console.warn('Link "to" node not found:', link);
                return;
              }
              // TODO: get real nodes position
              var sp = {
                x: source.pos.x,
                y: source.pos.y,
              };
              var tp = {
                x: target.pos.x,
                y: target.pos.y,
              };
              link.line = [sp, tp];

              if(!link._svg) {
                console.warn(' "svg" not created', link);
                return;
              }
              // if(isAnimated){
              //   link._svg.animate().plot([[sp.x, sp.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/ , [tp.x, tp.y]]);
              //   // link._svg.animate().plot(['M', sp.x, sp.y, 'L', target.pos.x, target.pos.y].join(' '));

              // }else{
              //   link._svg.plot([[sp.x, sp.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/ , [tp.x, tp.y]]);
              //   // link._svg.plot(['M', sp.x, sp.y, 'L', target.pos.x, target.pos.y].join(' '));
              // }
              link._svg.attr({
                style: css_style({
                  transform: myline(sp.x, sp.y, tp.x, tp.y, link._svg),
                  transition: 'all linear '+animation_time,
                 // 'transform-origin': 'left center'
                 'transform-origin': '0 0'
                })
              });

              // filter
              if($scope.filter!==null && $scope.filter!==undefined && $scope.filter !== id && ( tid!==$scope.filter || $scope.filterDirection!=="two") ){
                link._svg.hide();
              }else{
                link._svg.show();
                target._svg.show();
              }
          });

          _firstrun = false;
      }


      function css_translate(x, y){
        return 'translate(%s, %s) '.replace('%s', x+'px').replace('%s', y+'px');
      }
      function css_scale(factor){
        return 'scaleX(%s) '.replace('%s', factor);
      }
      function css_rotate(rad){
        // transform-origin works wrong in FF, so we use combination of this
        var dy = line_padding + line_width/2;

        return 'rotate(%srad) '.replace('%s', rad)
          + css_translate(0, -dy/2); // it's empirical division by 2
      }

      function css_get_position(element){

          // compiledTransform = 'matrix(1, 0, 0, 1, 155, 85.4552)'
          var compiledTransform = getComputedStyle(element).transform || '';
          // console.log('compiledTransform', compiledTransform);
          var m = compiledTransform.match(/[\w]+\((.*)\)/);
          var matrix = (m && m[1] || []).split(',').map(function(a){return parseInt(a)});
          console.log({x:matrix[4], y:matrix[5]});
          return {x:matrix[4], y:matrix[5]};
      }

      function css_style(obj){
        return Object.keys(obj).reduce(function(res, name){
          return res+name+':'+obj[name]+';';
        }, '');
      }

      function myline(x1,y1, x2,y2, _svg){
        var len2 = (x2-x1)*(x2-x1)+(y2-y1)*(y2-y1);
        var etalon = bgnd_c_radius*bgnd_c_radius;
        var factor = Math.sqrt(len2/etalon);

        // prevent overloop rotations
        if(typeof _svg._rotation === "undefined"){
          _svg._rotation = Math.atan2(y2-y1, x2-x1);
        }
        var rotation = Math.atan2(y2-y1, x2-x1);
        if(rotation - _svg._rotation > Math.PI){
          rotation -= 2*Math.PI;
        }
        if(_svg._rotation - rotation > Math.PI){
          rotation += 2*Math.PI;
        }
        _svg._rotation = rotation;

        return css_translate(x1, y1)+css_rotate(rotation)+css_scale(factor);
      }

      // make point projection on the line
      function orto_projection(lineP1, lineP2, point){
            // a*x + b*y - c1 = 0 // line[0]
            // b*x - a*y - c2 = 0 // cusror pos
            var x0 = lineP1.x;
            var y0 = lineP1.y;
            var x1 = lineP2.x;
            var y1 = lineP2.y;

            var x3 = point.x;
            var y3 = point.y;

            var p = 2*x0*y0-x0*y1-x1*y0;

            // var a1 = node.line[1].x - node.line[0].x;
            // var b1 = node.line[1].y - node.line[0].y;
            var a1 = (y0-y1)/p;
            var b1 = (x1-x0)/p;
            var b2 = a1;
            var a2 = -b1;

            var c1 = -(a1*x0 + b1*y0);
            var c2 = -(a2*x3 + b2*y3);

            var q = a1*b2-a2*b1;
            // http://e-maxx.ru/algo/lines_intersection
            return {
              x : (b1*c2-b2*c1)/q,
              y : (c1*a2-c2*a1)/q,
            };
      }

    } // -controller


  }; // -return
});


