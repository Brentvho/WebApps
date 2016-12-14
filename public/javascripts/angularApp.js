/**
 * Created by brent on 2016-11-19.
 */

var app = angular.module('flapperNews', [
    'ui.router'
]);


//service
app.factory('auth', ['$http', '$window', function($http, $window){
    var auth = {};
    var tokenStorage = 'web-apps-token';

    auth.saveToken = function (token) {
        $window.localStorage[tokenStorage] = token;
    };

    auth.getToken = function () {
        return $window.localStorage[tokenStorage];
    };

    auth.isLoggedIn = function () {
        var token = auth.getToken();
        if(token){
            var payload = JSON.parse($window.atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } else {
            return false;
        }
    };

    auth.currentUser = function () {
        if(auth.isLoggedIn()){
            var token = auth.getToken();
            var payload =  JSON.parse($window.atob(token.split('.')[1]));

            return payload.username;
        }
    };

    auth.register = function (user) {
        return $http.post('/register', user).success(function (data) {
            auth.saveToken(data.token);
        })
    };

    auth.login = function (user) {
        return $http.post('/login', user).success(function (data) {
            auth.saveToken(data.token);
        })
    };

    auth.logout = function () {
        $window.localStorage.removeItem(tokenStorage);
    };

    return auth;
}]);

app.factory('posts', ['$http', 'auth', function ($http, auth) {
    var o = {
      posts: [],
        filteredPosts: []
    };

    o.getAll = function() {
        return $http.get('/posts').success(function(data){
            angular.copy(data, o.posts);
        });
    };

    o.get = function (id) {
        return $http.get('/posts/' + id).then(function (res) {
            return res.data;
        })
    };

    o.create = function (post) {
        return $http.post('/posts', post, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).success(function(data) {
           o.posts.push(data);
           o.filteredPosts.push(data);
        });
    };

    o.removePost = function (post) {
        return $http.delete('/posts/' + post._id, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        });
    };

    o.upvote = function (post) {
        return $http.put('/posts/' + post._id + '/upvote', null, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).success(function (data) {
            post.upvotes += 1;
        });
    };

    o.downvote = function (post) {
        return $http.put('/posts/' + post._id + '/downvote', null, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).success(function (data) {
            post.upvotes -= 1;
        });
    };

    o.addComment = function (id, comment) {
        return $http.post('/posts/' + id + '/comments', comment, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        });
    };

    o.removeComment = function (id, comment){
        return $http.delete('/posts/' + id + '/comments/' + comment._id, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        });
    };

    o.upvoteComment = function (post, comment) {
        return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).success(function (data) {
            comment.upvotes += 1;
        })
    };

    o.downvoteComment = function (post, comment) {
        return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/downvote', null, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).success(function (data) {
            comment.upvotes -= 1;
        })
    };

    return o;
}]);

app.controller  ('MainCtrl', [
    '$scope', 'posts', 'auth', function($scope, posts, auth){
        $scope.posts = posts.posts;
        $scope.filteredPosts = posts.filteredPosts;
        $scope.currentPage = 0;
        $scope.pageSize = 10;
        $scope.loggedInUser = auth.currentUser();
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.title = '';

        $scope.upvote = function(post){
            posts.upvote(post);
        };

        $scope.downvote = function (post) {
            posts.downvote(post);
        };

        $scope.numberOfPages=  function () {
            return Math.ceil($scope.posts.length/$scope.pageSize);
        };

        $scope.addPost = function(){
            //prevent empty posts
            if(!$scope.title || $scope.title === ''){
                return;
            }
            posts.create({
                title: $scope.title,
                link: $scope.link
            });

            $scope.title = '';
            $scope.link = '';
        };

        $scope.removePost = function (post) {
            if($scope.loggedInUser == post.author){
                posts.removePost(post);

                var index = $scope.filteredPosts.indexOf(post);
                if(index > -1){
                    $scope.filteredPosts.splice(index, 1);
                }
            }else{
                $scope.error = "Can't delete posts from other people!";
            }
        };

        for(var i = 0; i < $scope.posts.length; i++){
            $scope.filteredPosts.push($scope.posts[i]);
        }
    }
]);

app.filter('startFrom', function() {
    return function(input, start) {
        start = +start;
        return input.slice(start);
    }
});

app.controller ('PostsCtrl', [
        '$scope', 'posts', 'post', 'auth', function ($scope, posts, post, auth) {
        $scope.loggedInUser = auth.currentUser();
        $scope.post = post;
        $scope.isLoggedIn = auth.isLoggedIn;

        $scope.addComment = function () {
            if($scope.body === '') {
                return;
            }
            posts.addComment(post._id, {
                body: $scope.body,
                author: 'user'
            }).success(function(comment){
                $scope.post.comments.push(comment);
            });

            $scope.body = '';
        };

        $scope.removeComment = function (comment) {
            if($scope.loggedInUser == comment.author){
                posts.removeComment(post._id, comment);

                var index = $scope.post.comments.indexOf(comment);
                console.log("Removing comment, index: " + index);
                if(index > -1){
                    $scope.post.comments.splice(index, 1);
                }
            }else{
                $scope.error ="";
                $scope.error.message = "Can't delete comments from other people!";
            }
        };

        $scope.upvote = function (comment) {
            posts.upvoteComment(post, comment);
        };

        $scope.downvote = function (comment) {
            posts.downvoteComment(post, comment);
        };
    }
]);

app.controller('AuthCtrl', [
        '$scope', '$state', 'auth', function ($scope, $state, auth) {
        $scope.user = {};

        $scope.register = function () {
            auth.register($scope.user).error(function (error) {
                $scope.error = error;
            }).then(function () {
                $state.go('home');
                $scope.user = {};

            })
        };

        $scope.login = function () {
            auth.login($scope.user).error(function (error) {
                $scope.error = error;
            }).then(function () {
                $state.go('home');
                $scope.user = {};

            });
        };
    }
]);

app.controller('NavCtrl', [
        '$scope', 'auth', function($scope, auth){
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.currentUser = auth.currentUser;
        $scope.logout = function () {
            auth.logout().error(function (error) {
                $scope.error = error;
            }).then(function () {
                $state.go('home');
            })
        };
    }
]);

app.config([ '$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '/home.html',
                controller: 'MainCtrl',
                resolve: {
                    postPromise: ['posts', function (posts) {
                        return posts.getAll();
                    }]
                }
            })

            .state('posts', {
                url: '/posts/{id}',
                templateUrl: '/posts.html',
                controller: 'PostsCtrl',
                resolve: {
                    post: ['$stateParams', 'posts', function ($stateParams, posts) {
                        return posts.get($stateParams.id);
                    }]
                }
            })

            .state('login', {
                url: '/login',
                templateUrl: '/login.html',
                controller: 'AuthCtrl',
                //redirecting to homepage if already logged in
                onEnter: ['$state', 'auth', function ($state, auth) {
                    if(auth.isLoggedIn()){
                        $state.go('home');
                    }
                }]
            })

            .state('register', {
                url: '/register',
                templateUrl: '/register.html',
                controller: 'AuthCtrl',
                //redirecting to homepage if already logged in
                onEnter: ['$state', 'auth', function ($state, auth) {
                    if(auth.isLoggedIn()){
                        $state.go('home');
                    }
                }]
            });

        $urlRouterProvider.otherwise('home');
    }
]);

app.directive('ngConfirmClick', [function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.bind('click', function() {
                var message = attrs.ngConfirmMessage;
                if (message && confirm(message)) {
                    scope.$apply(attrs.ngConfirmClick);
                }
            });
        }
    }
}]);