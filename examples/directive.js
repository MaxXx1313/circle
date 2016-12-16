angular.module('relationCircle', [])

// scope:
// = is for two-way binding
// @ simply reads the value (one-way binding)
// & is used to bind functions
.directive('relationCircle', function(){

var dataExample = [
  {
    id: 1,
    loan:{ 2: {val:500} }
  },
  {
    id: 2,
    loan: { 3: {val:300} }
  },
  {
    id: 3,
    loan: { 1: {val:200} }
  }
];

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
      filter:'=',             // {string} nodeId - showonly selected nodes and it's relations
      filterDirection:'='     // {'one'|'two'}
    },
    template: '<div id="drawing" class="blockchain-pie">'
              +'<div id="bc_popup_anchor"></div>'
              +'</div>',
    controllerAs: 'ctl',
    controller: function($scope, $element, $attrs, $transclude, $rootScope){
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

      var _firstrun = true;

      ctrl.draw = null;
      ctrl.nodes = {};

      $element.css({height: size, width:size, position: 'relative'});

      // create svg drawing
      ctrl.draw = SVG('drawing');
      var bgnd_circle = ctrl.draw.circle(2*bgnd_c_radius).attr({
          'fill-opacity': 0,
          'stroke-width': bg_border_w,
          'stroke':'#000'
        })
        .move(bgnd_c_center - bgnd_c_radius, bgnd_c_center - bgnd_c_radius);

      /**
       *
       */
      if( $().tooltip ){
        // show tooltip on hover

        $element.on('mouseover', function(e){
          if(/*e.target.tagName.toLowerCase() === 'circle' && */ e.target._svg){
            // console.log('mouseover', e.target._svg.id);
            showInfo(e.target._svg);
          }
        });

        $element.on('mouseout', function(e){
          // if(e.target === e.currentTarget){
          if(/*e.target.tagName.toLowerCase() === 'circle' && */ e.target._svg){
            $('#bc_popup_anchor').tooltip('destroy');
          }
        });
      }

      function showInfo(node){
          // console.log('hovered:', node.id);
          console.log('balance:', node.balance);
          var n = Object.keys(node.loan).length;
          var text = '$&nbsp;'+node.balance + '<br>' + 'Claims:&nbsp;' +n ;

          $('#bc_popup_anchor').css({height:0, width:0, position:'absolute', left: node.pos.x, top: node.pos.y-item_r })
          // .tooltip('destroy')
            .tooltip({title:text, html:true, animation:false}).tooltip('show');
          // $('svg circle:first').tooltip({title:'test'}).tooltip('show')


      }

      // update(false);

      // $element.on('click', function(){
      //   addNode(randomNode());
      //   _update();
      // });

      function randomNode(){
        var node = {id:parseInt(10+Math.random()*90), loan:{} };

        var loanCount = parseInt(1 + Math.random() * Object.keys(ctrl.nodes).length / 3); // maximum 1/3 of all nodes
        while(loanCount-->0){
          // loan
          var targetIds = Object.keys(ctrl.nodes);
          var tid = targetIds[parseInt(Math.random()*targetIds.length)];

          node.loan[tid] = {val: 0.1 + Math.random() };
        }

        return node;
      }

      /**
       *
       */
      $scope.$watch('filter', function(){
        console.log('Showing for '+$scope.filter);
        _update();
      });

      $scope.$watchCollection('data', function(){
        console.log('$scope.data');
        console.dir($scope.data);
        // make associcative
        var dataAssoc = $scope.data.reduce(function(r,c){
          r[c.id] = c;
          return r;
        },{});

        var oldNodes = Object.keys(ctrl.nodes);
        var newNodes = Object.keys(dataAssoc);
        var nodesDiff = _diff(oldNodes, newNodes);

        // nodesDiff.add.forEach(function(id){ addNode(dataAssoc[id]); });
        nodesDiff.remove.forEach(removeNode);

        Object.keys(dataAssoc).forEach(function(id){
          var node = dataAssoc[id];


          // loan
          var oldLoan = ctrl.nodes[id] ? Object.keys(ctrl.nodes[id].loan) : [];
          var newLoan = Object.keys(node.loan);

          var diff = _diff(oldLoan, newLoan);

          // node
          if(!ctrl.nodes[node.id]){
            addNode(node);

          // setTimeout(removeNode.bind(this, node.id), 2000); // DEBUG
          }else{
            // Update fields
            ctrl.nodes[node.id].balance = node.balance;
            node.color = ctrl.nodes[node.id].color;
          }


          diff.add.forEach(function(to){
            addLoan(id, to, node.loan[to].val );
          });
          diff.remove.forEach(function(to){
            removeLoan(id, to);
          });


        });

        _update();

      });


      function _diff(from, to){
          return {
              add: to.filter(function(item){ return from.indexOf(item)<0; }),
              remove:  from.filter(function(item){ return to.indexOf(item)<0; })
          };
      }



      function addLoan(from, to, value){
          console.log('addLoan', from, to);

          var me = ctrl.nodes[from];
          me.loan[to] = {
            val:value,
            svg: null
          };

          // svg
          var target = ctrl.nodes[to] || targetCenter;
          // me.loan[tid].svg = ctrl.draw.path(['M', me.pos.x, me.pos.y, 'L', target.pos.x, target.pos.y].join(' '))
          me.loan[to].svg = ctrl.draw.polyline([[me.pos.x, me.pos.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/, [target.pos.x, target.pos.y]])
            .back()
            .attr({
              // 'fill-opacity': 0.2,
              'stroke-opacity': 0.7,
              'stroke-width': 3,
              // 'stroke': _firstrun ? me.color : '#0F0'
              'stroke': me.color
            })
            // if(!_firstrun){
            //   me.loan[to].svg.animate().attr({'stroke': me.color});
            // }

          // setTimeout(removeLoan.bind(this, from, to), 2000); // DEBUG
      }


      /**
        *
        */
      function removeLoan(from, to){
        console.log('removeLoan', from, to);
        var node = ctrl.nodes[from];

        // svg
        _animateRemove( node.loan[to].svg, function(){
          delete node.loan[to];
        });

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
        fx.after(function(){ svgElement.remove(); cb && cb(); });
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
        if( !ctrl.nodes[node.id] ){
          console.log('addNode', node);
          ctrl.nodes[node.id] = node;

          var ids = Object.keys(ctrl.nodes);

          // body
          var me = ctrl.nodes[node.id];
          // me.pos = polarEntry();
          me.pos = polar(ids.indexOf(""+node.id), ids.length);

          me.color = randomColor();
          me.svg = ctrl.draw.circle(2*item_r0).attr({
              'stroke-width': 1, //item_border_w,
              // 'stroke':'#F33'
              'stroke': me.color,
              'fill': me.color
            })
            .move(me.pos.x-item_r0, me.pos.y-item_r0);

          me.svg.animate(300, '<')
            .attr({r:item_r})
            .move(me.pos.x-item_r, me.pos.y-item_r);

          me.svg.node._svg = me;



        }
      }

      /**
       *
       */
      function removeNode(id){
        var node = ctrl.nodes[id];
        if(node){

          Object.keys(node.loan).forEach(function(to){
            removeLoan(id, to);
          });

          // svg
          _animateRemove(node.svg, function(){
            delete ctrl.nodes[id];
          });

        }
      }


      // recalculate elements position
      function _update(isAnimated){
          if(typeof isAnimated === 'undefined'){
            isAnimated = !_firstrun;
          }

          var n = Object.keys(ctrl.nodes).length;
          Object.keys(ctrl.nodes).forEach(function(id, i){
            var me = ctrl.nodes[id];
            me.pos = polar(i, n);

            // body
            if(isAnimated){
              ctrl.nodes[id].svg.animate().move(me.pos.x-item_r, me.pos.y-item_r);
            }else{
              ctrl.nodes[id].svg.move(me.pos.x-item_r, me.pos.y-item_r);
            }


            // filter
            if($scope.filter!==null && $scope.filter!==undefined && $scope.filter !== id && (!me.loan[$scope.filter] || $scope.filterDirection!=="two")){
              me.svg.hide();
            }else{
              me.svg.show();
            }

          });



          // loans
          Object.keys(ctrl.nodes).forEach(function(id, i){
            var me = ctrl.nodes[id];

            Object.keys(me.loan).forEach(function(tid){
              var target = ctrl.nodes[tid] || targetCenter;


              var tp = {
                x: target.pos.x,
                y: target.pos.y,
              };

              var loan = me.loan[tid];
              if(!loan.svg) return;

              if(isAnimated){
                loan.svg.animate().plot([[me.pos.x, me.pos.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/ , [tp.x, tp.y]]);
                // loan.svg.animate().plot(['M', me.pos.x, me.pos.y, 'L', target.pos.x, target.pos.y].join(' '));

              }else{
                loan.svg.plot([[me.pos.x, me.pos.y] /*, [targetCenter.pos.x, targetCenter.pos.y]*/ , [tp.x, tp.y]]);
                // loan.svg.plot(['M', me.pos.x, me.pos.y, 'L', target.pos.x, target.pos.y].join(' '));
              }

              // filter
              if($scope.filter!==null && $scope.filter!==undefined && $scope.filter !== id && ( tid!==$scope.filter || $scope.filterDirection!=="two") ){
                me.loan[tid].svg.hide();
              }else{
                me.loan[tid].svg.show();
                target.svg.show();
              }



            });
          });

          _firstrun = false;
      }



    } // -controller
  }; // -return
});


