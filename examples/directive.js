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

return {
    restrict:'E',
    replace: true,
    // scope: true,
    scope: {
      size:'=',               // {number} size in px. default: 500
      data:'=',               // {} - data. see {@link dataExample}
      filter:'=',             // {string} nodeId - show only selected nodes and it's relations
      filterDirection:'='     // {'one'|'two'}
    },
    template: '<div id="drawing">'
              +'<div id="bc_popup_anchor"></div>'
              +'</div>',
    controllerAs: 'ctl',
    controller: function relationCircleController($scope, $element, $attrs, $transclude, $rootScope){
      var ctrl = this;
      var size = $scope.size = $scope.size || 500;
      // var filter = $scope.filter || null;


      //
      var bg_border_w = 4;
      // var item_border_w = 3;
      var item_r0 = 1;
      var item_r = 15;

      var bgnd_c_center = parseInt(size/2);
      var bgnd_c_radius = parseInt(bgnd_c_center-4*item_r);

      /**
       * @type {bolean}
       */
      var _firstrun = true;

      /**
       * Link to main svg object
       * @type {SVG}
       */
      ctrl._svg = null;

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



      init();
      /////////////////


      /**
       *
       */
      function init(){

        $element.css({height: size, width:size, position: 'relative'});

        // create main svg drawing
        ctrl._svg = SVG('drawing');
        var bgnd_circle = ctrl._svg.circle(2*bgnd_c_radius).attr({
            'fill-opacity': 0,
            'stroke-width': bg_border_w,
            'stroke':'#000'
          })
          .move(bgnd_c_center - bgnd_c_radius, bgnd_c_center - bgnd_c_radius);

        // bind tooltip
        if( $().tooltip ){
          // show tooltip on hover

          $element.on('mouseover', function(e){
            if(e.target._svg_original){
              // console.log('mouseover', e.target._svg_original.id);
              showTooltip(e.target._svg_original);
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
      function showTooltip(node){
          console.log('showTooltip', node);
          var text='';

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
          }else{
            // assume it's a link
            text = 'From&nbsp;{from}&nbsp;to&nbsp;{to}'.replace('{from}', node.from).replace('{to}', node.to)
                 + '<br>Value:&nbsp;' + node.value;
          }

          $('#bc_popup_anchor').css({height:0, width:0, position:'absolute', left: node.pos.x, top: node.pos.y-item_r })
          // .tooltip('destroy')
            .tooltip({title:text, html:true, animation:false}).tooltip('show');
          // $('svg circle:first').tooltip({title:'test'}).tooltip('show')
      }

      /**
       * @param {SVG} node (unused)
       */
      function hideTooltip(/*node*/){
        $('#bc_popup_anchor').tooltip('destroy');
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
          // check for dumplication
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

          // save
          _addToIndex(linkItem, newLinksIndex);
          newLinks.push(linkItem);

        });

        // update nodes (also get diff here)
        var diff = _diff(ctrl.links, newLinks);
        ctrl.links = newLinks;
        ctrl._linksIndex = newLinksIndex;


        // update coresponding svg elements
        // nodes
        Object.keys(ctrl.nodes).forEach(function(id){
          if(!ctrl.nodes[id]._svg){
            addNode(ctrl.nodes[id]);
          }
        });

        // links
        diff.add.forEach(function(link){
          addLink( link );
        });
        diff.remove.forEach(function(link){
          removeLink(link);
        });

        _update();

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
      function addLink(link){
          console.log('addLink', link);

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

          // me.loan[tid].svg = ctrl._svg.path(['M', me.pos.x, me.pos.y, 'L', target.pos.x, target.pos.y].join(' '))
          link._svg = ctrl._svg.polyline([[source.pos.x, source.pos.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/, [target.pos.x, target.pos.y]])
            .back()
            .attr({
              // 'fill-opacity': 0.2,
              'stroke-opacity': 0.7,
              'stroke-width': 3,
              // 'stroke': _firstrun ? me.color : '#0F0'
              'stroke': link.color || source.color
            })
            // if(!_firstrun){
            //   me.loan[to].svg.animate().attr({'stroke': me.color});
            // }

          // setTimeout(removeLink.bind(this, from, to), 2000); // DEBUG
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
          .attr({'stroke':'#F00', 'fill':'#F00', 'stroke-width':4})
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
      function addNode(node){
        console.log('addNode', node);


        // body
        var me = node;
        // me.pos = polarEntry();
        var ids = Object.keys(ctrl.nodes);
        me.pos = polar(ids.indexOf(""+node.id), ids.length);

        // me.color = randomColor();
        me._svg = ctrl._svg.circle(2*item_r0).attr({
            'stroke-width': 1, //item_border_w,
            // 'stroke':'#F33'
            'stroke': me.color,
            'fill': me.color
          })
          .move(me.pos.x-item_r0, me.pos.y-item_r0);

        me._svg.animate(300, '<')
          .attr({r:item_r})
          .move(me.pos.x-item_r, me.pos.y-item_r);

        // link back to object
        me._svg.node._svg_original = me;

      }

      /**
       *
       */
      function removeNode(id){
        var node = ctrl.nodes[id];
        if(node){

          Object.keys(node.loan).forEach(function(to){
            removeLink(id, to);
          });

          // svg
          _animateRemove(node.svg, function(){
            delete ctrl.nodes[id];
          });

        }
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
            if(isAnimated){
              ctrl.nodes[id]._svg.animate().move(me.pos.x-item_r, me.pos.y-item_r);
            }else{
              ctrl.nodes[id]._svg.move(me.pos.x-item_r, me.pos.y-item_r);
            }


            // filter
            if($scope.filter!==null && $scope.filter!==undefined && $scope.filter !== id){
              me._svg.hide();
            }else{
              me._svg.show();
            }

          });



          // loans
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

              if(!link._svg) {
                console.warn('Link "svg" not crested', link);
                return;
              }
              if(isAnimated){
                link._svg.animate().plot([[sp.x, sp.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/ , [tp.x, tp.y]]);
                // link._svg.animate().plot(['M', sp.x, sp.y, 'L', target.pos.x, target.pos.y].join(' '));

              }else{
                link._svg.plot([[sp.x, sp.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/ , [tp.x, tp.y]]);
                // link._svg.plot(['M', sp.x, sp.y, 'L', target.pos.x, target.pos.y].join(' '));
              }

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



    } // -controller


  }; // -return
});


