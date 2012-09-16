var socket = io.connect( 'api.mss.gs', { port: 443, secure: true, reconnect: true }),
    user   = JSON.parse( localStorage.getItem( 'user' ) ),
    conv   = JSON.parse( localStorage.getItem( 'conv' ) ),
    app    = {
    	load: function() {
            $( app.listeners );

            // Authorize app (and do logic)
            socket.emit( 'credentials', { 'id': '27a803c317a8e4f0071d374d7ceb9082', 'secret': 'SVhbc42YvnJy' } );
    	},
        error: function(text) {
            alert( text );
        },
        reload: function() {
            $( '#main article' ).addClass( 'hidden' );
        },
        new: function() {
            $( '#main article.new' ).removeClass( 'hidden' );
            $( '#main .new [name="new"]' ).bind( 'click', function() {
                socket.emit( 'create conversation' );
            });
            $( '#main .new [name="join"]' ).bind( 'click', function() {
                if( $( '#main .new [name="join_password"]' ).val() )
                    localStorage.setItem( 'password', $( '#main .new [name="join_password"]' ).val() );
                socket.emit( 'join conversation', { 'conversation': $( '#main .new [name="join_id"]' ).val(), 'password': ( $( '#main .new [name="join_password"]' ).val() ? $( '#main .new [name="join_password"]' ).val() : false ) } );
            });

        },
        addUser: function( username, globalop, op, conversation, avatar ) {
            if( !$( '#main sidebar ul li[data-username="' + username + '"]' ).length ) {
                var li   = $( '<li />' ).attr( 'data-username', username ),
                    span = $( '<span />' ).addClass( 'active' ),
                    img  = $( '<img />' ).attr( {
                        'width': 32,
                        'height': 32
                    }),
                    h3   = $( '<h3 />' ).text( username );
                
                li.append( span );    
                if( avatar ) {
                    li.append( img );
                }
                li.append( h3 );

                $( '#main sidebar ul' ).append( li );
            }
        },
        removeUser: function( username, conversation ) {
            $( '#main sidebar ul li[data-username="' + username + '"]' ).remove;
        },
        addMessage: function( who, text, avatar, date, me, init ) {
            var imgDiv = $( '<div />' ),
                li     = $( '<li />' ).attr( 'data-username', who ),
                p      = $( '<p />' ).text( text ),
                d      = new Date( ( date * 1000 ) );

            if( $( '#main section .chat ul li:last-child' ).attr( 'data-username' ) == who ) {
                $( '#main section .chat ul li:last-child div:nth-child(2)' ).append(
                    $( '<span />' ).text( d.getHours() + ':' + d.getMinutes() + ' ' + d.getDate() + '/' + d.getMonth() + '/' + d.getFullYear() )
                );
                $( '#main section .chat ul li:last-child div:nth-child(2)' ).append( p );
            } else {
                if( avatar ) {
                    imgDiv.append(
                        $( '<img />' ).attr( {
                            'width': 50,
                            'height': 50,
                            'src': avatar
                        })
                    );
                }

                li.append( imgDiv );
                li.append(
                    $( '<div />' ).append(
                        $( '<span />' ).text( ' - ' + d.getHours() + ':' + d.getMinutes() + ' ' + d.getDate() + '/' + d.getMonth() + '/' + d.getFullYear() ).prepend(
                            $( '<strong />' ).text( who )
                        )
                    ).append(
                        p
                    )
                );
                $( '#main section .chat ul' ).append( li );
            }

            if( who == user.username )
                li.addClass( 'me' );

            if( !init )
                $( '#main section' ).animate({ scrollTop: $( '#main section article.chat' ).height() }, 300);
        },
        chat: function( conversation ) {
            $( '#main article.chat' ).removeClass( 'hidden' );
            $( '#main .chat [type="text"]' ).bind( 'keypress', function(e) {
                var code = (e.keyCode ? e.keyCode : e.which);
                if(code == 13) { //Enter keycode
                    socket.emit( 'message', { 'text': $( this ).val(), 'conversation': conversation } );
                    $( this ).val( '' );
                }
            });
            $( '#main section' ).animate({ scrollTop: $( '#main section article.chat' ).height() }, 300);
        },
        invite: function() {
            $( '#main article.invite' ).removeClass( 'hidden' );
        },
    	settings: function() {
            $( '#main article.settings' ).removeClass( 'hidden' );
            if( user && user.username ) {
                $( '#main article.settings input[name="name"]' ).val( user.username );
                if( user.avatar )
                    $( '#main article.settings input[name="avatar"]' ).val( user.avatar );
            }
    		$( '#main .settings [type="submit"]' ).bind( 'click', function() {
	    		socket.emit( 'auth', {
                    'username': $( '.settings [name="name"]' ).val(),
                    'avatar': $( '.settings [name="avatar"]' ).val(),
                    'conversationId': ''
                } );
    		});
    	},
        logout: function() {
            user = 0;
            localStorage.removeItem( 'user' );
            localStorage.removeItem( 'conv' );
            localStorage.removeItem( 'password' );
            $( 'header section article h1' ).addClass( 'hidden' ).text( '' );
            $( 'header section article img' ).addClass( 'hidden' );
            $( 'header sidebar ul li.chat' ).remove();
            $( '#main sidebar ul li' ).remove();
        },
        listeners: function() {
            $( 'header sidebar ul li.invite' ).bind( 'click', function() {
                $( app.reload );
                $( app.invite );
            });
            $( 'header sidebar ul li.settings' ).bind( 'click', function() {
                $( app.reload );
                $( app.settings );
            });
            $( 'header sidebar ul li.new' ).bind( 'click', function() {
                $( app.reload );
                $( app.new );
            });
            $( 'header section .logout' ).bind( 'click', function() {
                $( app.reload );
                $( app.logout );
                $( app.settings );
            });

            socket.on( 'auth', function( data ) {
                if( data.valid ) {
                    var userData = {};
                    userData.username = data.username;
                    userData.avatar   = ( user && user.avatar ? user.avatar : $( '.settings [name="avatar"]' ).val() );
                    userData = JSON.stringify( userData );
                    localStorage.setItem( 'user', userData );
                    user = JSON.parse( localStorage.getItem( 'user' ) );
                    $( 'header section article h1' ).removeClass( 'hidden' ).text( user.username ).append( $( '<span />' ).addClass( 'active' ) );
                    $( 'header section article img' ).removeClass( 'hidden' ).attr( 'src', user.avatar );
                    $( app.reload );
                    if( conv && conv.conversation ) {
                       socket.emit( 'join conversation', { 'conversation': conv.conversation, 'password': ( localStorage.getItem( 'password' ) ? localStorage.getItem( 'password' ) : false ) } );
                    } else {
                        $( app.new );
                    }
                } else {
                    $( app.reload );
                    $( app.error( 'Invalid user' ) );
                }
            } );

            socket.on( 'credentials', function(data) {
                if( data.valid ) {
                    if( user && user.username ) {
                        socket.emit( 'auth', {
                            'username': user.username,
                            'avatar': user.avatar,
                            'conversationId': ( conv ? conv.conversation : '' )
                        } );
                        $( 'header section article h1' ).removeClass( 'hidden' ).text( user.username ).append( $( '<span />' ).addClass( 'active' ) );
                        if( user.avatar )
                            $( 'header section article img' ).removeClass( 'hidden' ).attr( 'src', user.avatar );
                    } else {
                        $( app.settings );
                    }
                } else {
                    $( app.error( 'Invalid app' ) );
                }
            });

            socket.on( 'conversation', function(data) {
                var convData = {};
                convData[ 'channel' ] = data.channel;
                convData[ 'conversation' ] = data.conversation;
                if( localStorage.getItem( 'password' ) )
                    convData[ 'password' ] = localStorage.getItem( 'password' );
                localStorage.setItem( 'conv', JSON.stringify( convData ) );
                var conv = JSON.parse( localStorage.getItem( 'conv' ) );

                $( app.reload );
                $( app.chat( data.conversation ) );

                var username = '',
                    globalop = false,
                    op       = false;

                $.each( data.usernames, function(i) {
                    username = data.usernames[i];
                    $( app.addUser( username, data.conversation ) );
                });

                $.each( data.globalop, function(i) {
                    globalop = data.globalop[i];
                    $( app.addUser( globalop, data.conversation ) );
                });

                $.each( data.op, function(i) {
                    op = data.op[i];
                    $( app.addUser( op, data.conversation ) );
                });

                $( 'header sidebar ul' ).append(
                    $( '<li />' ).addClass( 'chat' ).append(
                        $( '<span />' ).addClass( 'icon-comments-alt' )
                    ).bind( 'click', function() {
                        $( app.reload );
                        $( app.chat( data.conversation ) )
                    })
                );
            });

            socket.on( 'message', function( data ) {
                if( data.provider == 'internal' ) {
                    // 
                } else {
                    $( app.addMessage( data.username, data.message, data.image, data.date, false, false ) );
                }
            });

            socket.on( 'messages', function( data ) {
                $.each( data, function(i) {
                    message = data[i];
                    $( app.addMessage( message.username, message.message, message.image, message.date, false, true ) );
                    
                    if( i == ( data.length - 1 ) )
                        $( '#main section' ).animate({ scrollTop: $( '#main section article.chat' ).height() }, 300);
                });
            });

            socket.on( 'join conversation', function(data) {
                $( app.addUser( data.username, data.op, data.globalop, data.conversation ) );
            });

            socket.on( 'leave conversation', function(data) {
                $( app.removeUser( data.username, data.conversation ) );
            });
        }
    };

$( window ).load( function() {
	$( app.load );

	setTimeout( function() {
		$( this ).trigger( 'resize' );
	}, 300 );
});

$( window ).bind( 'resize', function(){
	$( '#main sidebar, #main section' ).css( 'height', 'auto' );
	$( '#main sidebar' ).height( $( window ).height() - 83 );
	$( '#main section' ).height( $( window ).height() - 83 );
    $( '#main section article' ).width( $( window ).width() - 200 );
    $( '#main section .chat ul li div:nth-child(2)' ).width( $( window ).width() - 280 );
    if( !$( '.chat' ).hasClass( 'hidden' ) )
        $( '#main section' ).animate({ scrollTop: $( '#main section article.chat' ).height() }, 300);
});