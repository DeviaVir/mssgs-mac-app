var socket = io.connect( 'api.mss.gs', { port: 443, secure: true, reconnect: true } ),
    user   = JSON.parse( localStorage.getItem( 'user' ) ),
    conv   = JSON.parse( localStorage.getItem( 'conv' ) ),
    inactive = false,
    notifications = false,
    badgeAmount = 0,
    hasMG  = false,
    global = { // Cool global functions
        findLinks: function(text) {
            var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,
                img = false;
            text.replace( exp, function( s, m1 ) {
                if( global.IsValidImageUrl( m1 ) )
                    img = true;
            } );
            return text.replace( exp, "<a href='$1' target='_blank'>" + ( img ? "<img src='$1' />" : "$1" ) + "</a>" ); 
        },
        IsValidImageUrl: function(url) {
            var isImg = false;
            switch( url.substr(-3).toLowerCase() ) {
                case 'png':
                case 'jpg':
                case 'gif':
                case 'bmp':
                    isImg = true;
                break;
            }
            return( isImg );
        },
        capitaliseFirstLetter: function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
    },
    mg     = { // This is the macgap handler
        load: function() {
            if( typeof macgap === 'undefined' ) {
                hasMG = false;
            } else {
                hasMG = true;
            }
        },
        notify: function( calledTitle, calledContent ) {
            if( hasMG ) {
                macgap.notice.notify({
                    title: calledTitle,
                    content: calledContent
                });
            }
        },
        badge: function( amount ) {
            if( hasMG ) {
                macgap.dock.badge = amount;
                badgeAmount = amount;
            }
        },
        quit: function() {
            if( hasMG ) {
                macgap.app.terminate();
            }
        },
        activate: function() {
            if( hasMG ) {
                macgap.app.activate();
            }
        },
        hide: function() {
            if( hasMG ) {
                macgap.app.hide();
            }
        },
        beep: function() {
            if( hasMG ) {
                macgap.app.beep();
            }
        }
    },
    app    = {
    	load: function() {
            app.listeners();
            app.resize();
            /*$(".nano").nanoScroller();*/

            // Clear messages
            $( '#main section .chat ul' ).children().remove();

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
                if( conv && conv.conversation )  {
                    app.error( 'Conversation already exists. Please log out first.' );
                } else {
                    socket.emit( 'create conversation' );
                }
            });
            $( '#main .new [name="join"]' ).bind( 'click', function() {
                if( conv && conv.conversation ) {
                    app.error( 'Conversation already exists. Please log out first.' );
                } else {
                    if( $( '#main .new [name="join_password"]' ).val() )
                        localStorage.setItem( 'password', $( '#main .new [name="join_password"]' ).val() );
                    socket.emit( 'join conversation', { 'conversation': $( '#main .new [name="join_id"]' ).val(), 'password': ( $( '#main .new [name="join_password"]' ).val() ? $( '#main .new [name="join_password"]' ).val() : false ) } );
                }
            });

        },
        addUser: function( username, globalop, op, conversation, avatar ) {
            if( !$( '#main sidebar ul li[data-username="' + username.toLowerCase() + '"]' ).length ) {
                var li   = $( '<li />' ).attr( 'data-username', username.toLowerCase() ),
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
            $( '#main sidebar ul li[data-username="' + username.toLowerCase() + '"]' ).remove();
        },
        addInternal: function( message, date, init ) {
            var li   = $( '<li />' ).addClass( 'internal' ),
                type = message.split( ':' ).shift(),
                arr  = message.split( ':' ),
                skip = false,
                d       = new Date( ( date * 1000 ) ),
                dateV   = ( '0' + d.getHours() ).slice(-2) + ':' + ( '0' + d.getMinutes() ).slice(-2) + ' ' + ( '0' + d.getDate() ).slice(-2) + '/' + ( '0' + d.getMonth() ).slice(-2) + '/' + d.getFullYear(),
                allowScroll = ( $( '#main section' ).scrollTop() == $( '#main section article.chat' ).prop( 'scrollHeight' ) ? true : false );
            arr.shift();
            message = arr.join( ':' );
            message = jQuery.parseJSON(message);

            switch( type ) {
                case 'join':
                    type    = 'Joined chat';
                    message = message.username;
                break;
                case 'leave':
                    type    = 'Leaves chat';
                    message = message.username;
                break;
                case 'opunlock':
                    skip = true;
                break;
                case 'kick':
                    type    = 'Kicked:';
                    message = message.username;
                break;
                case 'me':
                    type = message.username;
                    message = message.message;
                break;
            }

            if( !skip ) {
                li.append(
                    $( '<div />' )
                ).append(
                    $( '<div />' ).append(
                        $( '<span />' ).text( ': ' + message + ' @ ' + dateV ).prepend(
                            $( '<strong />' ).text( type )
                        )
                    )
                )

                $( '#main section .chat ul' ).append( li );
                if( !init/* && allowScroll*/ ) 
                    app.scroll();
            }
        },
        renderMessage: function( text ) {
                var text = $( '<pre />' ).text( text ).html(),
                text =  text.trim().replace( /\n/g, ' <br />\n' ) + ' ', patterns = { 
                        url: /(\s?)(http\:\/\/|https\:\/\/|ftp\:\/\/|ftps\:\/\/|)(www\.|)([a-zA-Z0-9.\-]{1,})([\.]{1}[a-zA-Z0-9\-\&\~]{2,5})([\.]{1}[a-zA-Z\~\&\']{2,5})?(:[0-9]{0,})?(\/[a-zA-Z0-9\&#!:\.\_\;\~?+{}\{\}=\[\,\'&%@!\-\/]{0,})?(?=\s)/gi,
                        skype: /skype\:\/\/([a-zA-Z0-9]{1,})/gi,
                        bold: /\[b\]([^\[]{1,})\[\/b\]/gi,
                        names: /\[name\]([^\[]{1,})\[\/name\]/gi,
                        italic: /\[i\]([^\[]{1,})\[\/i\]/gi,
                        indent: /\[indent\]/gi,
                        code: /```(\s<br \/>\n)?([^`]+)(\s<br \/>\n)?```/gm,
                        codeSingle: /`(\s<br \/>\n)?([^`]+)(\s<br \/>\n)?`/gm,
                        name: /\@([a-z\_A-Zé0-9]{1,})(;\s|:\s|\s?)/gi,
                        tag: /\#([a-zA-Zé0-9\-]{1,})(\s?)/gi
                };
      
                // Methods
                var codeblocks = [], urls = []
                text = text.replace( patterns.code, function( full, space, content, space ) {
                        return '{codeblockm:' + codeblocks.push(content.replace( /<br \/>/gm, '' ).trim()) + '}';
                })
                text = text.replace( patterns.codeSingle, function( full, space, content, space ) {
                        return '{codeblocks:' + codeblocks.push(content.replace( /<br \/>/gm, '' ).trim()) + '}';
                })
                
                var foundVideos = 0;
                text = text.replace( patterns.url, function( url, opt, prefix, www ) {
                        url = url.trim()
                        if( !prefix )
                                url = 'http://' + url
                                
                        if( foundVideos < 2 ) {
                                var youtube = null, args = []
                                if( arguments[4] == 'open.spotify' && arguments[5] == '.com' && arguments[8] && (arguments[8].substr( 0, 6 ) == '/track' || arguments[8].substr( 0, 6 ) == '/album' || arguments[8].split('/')[3] == 'playlist' ) ) {     
                                        foundVideos++;
                                        return '<iframe class="embed spotify" src="https://embed.spotify.com/?uri=spotify' + arguments[8].replace( /\//g, ':' ).replace( /\"/g, '' ).replace( /[^a-z\:A-Z0-9\_]+/g, '' ).trim() + '" width="300" height="80" frameborder="0" allowtransparency="true"></iframe>';
                                }
                                else if( arguments[4] == 'vimeo' && arguments[5] == '.com' && !isNaN( arguments[8].substr(1) ) ) {
                                        foundVideos++;
                                        return '<iframe class="embed youtube" src="http://player.vimeo.com/video' + arguments[8].replace( /\"/g, '' ).replace( /[^a-zA-Z0-9\_]+/g, '' ).trim() + '" width="560" height="315" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';
                                }
                                else if( arguments[4] == 'youtu' && arguments[5] == '.be' && arguments[8] && arguments[8].split( '&' )[0].match(/[a-zA-Z0-9\-\/.]/) != null ) {
                                        foundVideos++;
                                        youtube = arguments[8].split( '&' )[0]
                                        args = arguments[8].split( '&' ).splice(1)
                                }
                                else if( arguments[4] == 'youtube' && arguments[5] == '.com' && arguments[8] && arguments[8].substr( 0, 6 ) != '/watch' && arguments[8] && arguments[8].split( '/' )[2].match(/[a-zA-Z0-9\)\-\/.]/) != null ) {
                                        foundVideos++;
                                        youtube = arguments[8].split( '/' )[2]
                                }
                                else if( arguments[4] == 'youtube' && arguments[5] == '.com' && arguments[8] && arguments[8].substr( 0, 6 ) == '/watch' ) {
                                        foundVideos++;
                                        youtube = arguments[8].split( 'v=' )[1].split( '&amp;' )[0]
                                        args = arguments[8].split( 'v=' )[1].split( '&amp;' ).splice(1)
                                }
                                if( youtube ) 
                                        return '<iframe class="embed youtube" width="560" height="315" src="https://www.youtube-nocookie.com/embed/' + youtube.replace( /[^a-zA-Z0-9\-\_]+/g, '' ).trim() + '?theme=light" frameborder="0" allowfullscreen></iframe>';
                                delete youtube, args
                        }
                        
                        /*var urlChecker = url.replace( /http:\/\//g, '' ).replace( /https:\/\//g, '' );
                        if( urlChecker.substr(0,12) == 'twitter.com/' ) {
                                // Is status?
                                var urlSplit = urlChecker.split( '/' );
                                if( urlSplit[2] == 'status' ) {
                                        var tweetId = urlSplit[3].replace( /[^0-9]+/g, '' ).trim(), tweetIdTime = ( tweetId + '' + new Date().getTime() );
                                        $.get( 'http://api.twitter.com/1/statuses/oembed.json?id=' + tweetId + '&align=left&omit_script=true&callback=?', function(resp){
                                                $( '#' + tweetIdTime ).html( resp.html )
                                                setTimeout(function(){
                                                        gui.conversation.emit( 'scrolldown', [maxIt] )
                                                }, 10);
                                        }, 'jsonp' )
                                        return '<tweet class="tweet" id="' + tweetIdTime + '">Loading tweet..</tweet>';
                                }
                        }*/
   
                        var imgurCode;
                        if( url.substr(7,9) == 'imgur.com' ) {
                                // Cross request
                                imgurCode = url.replace( /gallery\//g, empty ).substr(17)
                                $.getJSON( 'http://api.imgur.com/2/image/' + imgurCode + '.json', function(data) {
                                        if( data ) {
                                                $( '#chat-content a.imgur.' + data.image.image.hash ).each(utils.scope(data,function(i,el){
                                                        $( '<img />' ).data( 'url', this.image.links.imgur_page ).attr( 'src', this.image.links.small_square ).bind( 'load', function(){
                                                                gui.conversation.emit( 'scrolldown', [maxIt] )
                                                        }).click(function(){
                                                                window.open($(this).data( 'url' ))
                                                        }).addClass( 'thumb' ).insertBefore( el )
                                                        $(el).remove()
                                                }))
                                        }
                                })
                        }
                        else {
                                var imageCheckUrl = url.split( '?' )[0],
                                imageCheckExtensionURL = imageCheckUrl.toLowerCase()
                                if( imageCheckExtensionURL.substr( -6 ) == ':large' || imageCheckExtensionURL.substr( -4 ) == '.png' || imageCheckExtensionURL.substr( -4 ) == '.jpg' || imageCheckExtensionURL.substr( -4 ) == '.gif' || imageCheckExtensionURL.substr( -5 ) == '.jpeg' 
                                 || imageCheckExtensionURL.substr( -7, 4 ) == '.png' || imageCheckExtensionURL.substr( -7, 4 ) == '.jpg' || imageCheckExtensionURL.substr( -7, 4 ) == '.gif' || imageCheckExtensionURL.substr( -8, 5 ) == '.jpeg' )
                                        return opt + '<img onerror="$(\'<i>\' + this.src.substr(7) + \'</i>\').insertBefore(this); $(this).remove(); app.scroll();" src="' + imageCheckUrl.replace( /"/, '%22' ) + '" onload="app.scroll();" class="thumb" onclick="window.open(\'' + imageCheckUrl.replace( /"/, '%22' ).replace( /'/, '\\\'' ) + '\')" />';
                                delete imageCheckUrl, imageCheckExtensionURL 
                        }
                        
                        url = $( '<div />' ).html( url ).text()
                        return '{url:' + urls.push(opt + $( '<div />' ).append( $( '<a />' ).addClass( 'link' + ( imgurCode ? ' imgur ' + imgurCode : empty ) ).attr( 'target', '_blank' ).attr( 'href', url ).text( ( www ? url.split( '://www.' )[1] : url.split( '://' )[1] ) ) ).html()) + '}'
                })
                
                //text = text.replace( patterns.name, utils.scope(me[0], function( full, name, opt ) {
                //        return '<a class="mention" target="_blank" href="https://twitter.com/' + name.replace( /[^a-zA-Z0-9]+/g, '' ).trim() + '"><tag class="tag">@</tag>' + name + '</a>' + opt
                //}))
                //text = text.replace( patterns.tag, utils.scope(me[0], function( full, name, opt ) {
                //        return '<a class="tag" target="_blank" href="http://express.mss.gs/channel/' + name.replace( /[^a-zA-Z0-9]+/g, '' ).trim() + '"><tag class="tag">#</tag>' + name + '</a>' + opt
                //}))
                text = text.replace( patterns.names, function( text, name ) {
                        return '<b>' + name + '</b>'
                })
                text = text.replace( patterns.bold, function( text, name ) {
                        return '<strong>' + name + '</strong>'
                })
                text = text.replace( patterns.indent, function( text, name ) {
                        return '&nbsp;'
                })
                text = text.replace( patterns.italic, function( text, name ) {
                        return '<i>' + name + '</i>'
                })
                text = text.replace( /\{codeblockm:([0-9]{0,})\}/gi, function( text, num ){
                        return $( '<div />' ).append( $( '<pre />' ).addClass( 'multi' ).addClass( 'code' ).html( codeblocks[(num-1)] ) ).html()
                })
                text = text.replace( /\{codeblocks:([0-9]{0,})\}/gi, function( text, num ){
                        return $( '<div />' ).append( $( '<pre />' ).addClass( 'single' ).addClass( 'code' ).html( codeblocks[(num-1)] ) ).html()
                })
                text = text.replace( /\{url:([0-9]{0,})\}/gi, function( text, num ){
                        return urls[( num -1 )]
                })
                
                return text;
        },
        addMessage: function( who, text, avatar, date, me, init ) {
            var imgDiv  = $( '<div />' ),
                li      = $( '<li />' ).attr( 'data-username', who.toLowerCase() ),
                message = app.renderMessage( text ),
                p       = $( '<p />' ).html( message ),
                d       = new Date( ( date * 1000 ) ),
                dateV   = ( '0' + d.getHours() ).slice(-2) + ':' + ( '0' + d.getMinutes() ).slice(-2) + ' ' + ( '0' + d.getDate() ).slice(-2) + '/' + ( '0' + d.getMonth() ).slice(-2) + '/' + d.getFullYear(),
                allowScroll = ( $( '#main section' ).scrollTop() == $( '#main section article.chat' ).prop( 'scrollHeight' ) ? true : false );

            $( '#main sidebar ul li[data-username="' + who.toLowerCase() + '"]' ).attr( 'data-date', date )
            if( $( '#main section .chat ul li:last-child' ).attr( 'data-username' ) == who.toLowerCase() ) {
                $( '#main section .chat ul li:last-child div:nth-child(2)' ).append(
                    $( '<span />' ).text( dateV )
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
                        $( '<span />' ).text( ' - ' + dateV ).prepend(
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

            if( !init /*&& allowScroll*/ ) 
                app.scroll();
        },
        chat: function( conversation ) {
            $( '#main article.chat' ).removeClass( 'hidden' )
            $( '#main' ).addClass( 'loading' );
            setTimeout( function() { // Reasonably high timeout to make sure it happens correctly
                $( '#main' ).removeClass( 'loading' );
                app.scroll();
            }, 3000 );
            $( '#textarea' ).bind( 'keypress', function(e) {
                var code = (e.keyCode ? e.keyCode : e.which);
                if( $( this ).val() && code == 13 && !e.shiftKey ) {
                    socket.emit( 'message', { 'text': $( '#textarea' ).val(), 'conversation': conversation } );
                    $( this ).val( "" );
                    e.preventDefault();
                }
            });
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
            $( '#main article.settings #notifications' ).bind( 'click', function() {
                if( $( this ).is( ':checked' ) )
                    notifications = true;
                else
                    notifications = false;
            });
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
            conv = 0;
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
                app.reload();
                app.invite();
            });
            $( 'header sidebar ul li.settings' ).bind( 'click', function() {
                app.reload();
                app.settings();
            });
            $( 'header sidebar ul li.new' ).bind( 'click', function() {
                app.reload();
                app.new();
            });
            $( 'header .logout' ).bind( 'click', function() {
                app.reload();
                app.logout();
                app.settings();
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
                    app.reload();
                    if( conv && conv.conversation ) {
                        app.chat( conv.conversation );
                        socket.emit( 'join conversation', { 'conversation': conv.conversation, 'password': ( localStorage.getItem( 'password' ) ? localStorage.getItem( 'password' ) : false ) } );
                    } else {
                        app.new();
                    }
                } else {
                    app.reload();
                    app.error( 'Invalid user' );
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
                        app.settings();
                    }
                } else {
                    app.error( 'Invalid app' );
                }
            });

            socket.on( 'usernames', function(data) {
                $.each( data.usernames, function(i) {
                    username = data.usernames[i];
                    app.addUser( username, data.conversation );
                });
            })

            socket.on( 'conversation', function(data) {
                var convData = {};
                convData[ 'channel' ] = data.channel;
                convData[ 'conversation' ] = data.conversation;
                convData[ 'activity' ] = data.activity;
                if( localStorage.getItem( 'password' ) )
                    convData[ 'password' ] = localStorage.getItem( 'password' );
                localStorage.setItem( 'conv', JSON.stringify( convData ) );
                var conv = JSON.parse( localStorage.getItem( 'conv' ) );

                app.reload();
                app.chat( data.conversation );

                if( $( 'header sidebar ul li.chat' ).length ) {
                    $( 'header sidebar ul li.chat' ).remove();
                    $( 'header sidebar ul' ).append(
                        $( '<li />' ).addClass( 'chat' ).append(
                            $( '<span />' ).addClass( 'icon-comments-alt' )
                        ).bind( 'click', function() {
                            app.reload();
                            app.chat( data.conversation );
                        })
                    );
                } else {
                    $( 'header sidebar ul' ).append(
                        $( '<li />' ).addClass( 'chat' ).append(
                            $( '<span />' ).addClass( 'icon-comments-alt' )
                        ).bind( 'click', function() {
                            app.reload();
                            app.chat( data.conversation );
                        })
                    );
                }

                setTimeout( function() {
                    $.each( conv.activity, function(i,v) {
                        var userLi = $( '#main sidebar ul li[data-username="' + i.toLowerCase() + '"]' );  

                        setInterval( function() {
                            var currentTime = Math.floor(new Date().getTime()/1000),
                                oldTime = ( userLi.attr( 'data-date' ) > conv.activity[i] ? userLi.attr( 'data-date' ) : conv.activity[i] );
                            if( (currentTime - oldTime) > (60*60) )
                                userLi.children( 'span' ).removeClass( 'active' ).addClass( 'away' ).removeClass( 'inactive' );
                            else if( (currentTime - oldTime) > (60*15) )
                                userLi.children( 'span' ).removeClass( 'active' ).removeClass( 'away' ).addClass( 'inactive' );
                            else if( (currentTime - oldTime) > (60*5) )
                                userLi.children( 'span' ).removeClass( 'active' ).removeClass( 'away' ).addClass( 'inactive' );
                            else
                                userLi.children( 'span' ).addClass( 'active' ).removeClass( 'away' ).removeClass( 'inactive' );
                        }, 1000 );                     
                    });
                }, 1000 );
            });

            socket.on( 'message', function( data ) {
                var init = false;
                if( data.provider == 'internal' ) {
                    app.addInternal( data.message, data.date, false );
                } else {
                    // Notify user of name calling
                    if( notifications ) {
                        if( inactive ) {
                            mg.notify( data.username, data.message );
                        }
                    } else {
                        if( data.message.toLowerCase().indexOf( user.username.toLowerCase() ) >= 0 ) {
                            mg.notify( data.username, data.message );
                        }
                    }

                    var currentTime = Math.floor(new Date().getTime()/1000);
                    $( '#main sidebar ul li[data-username="' + data.username.toLowerCase() + '"]' ).attr( 'data-date', currentTime );
                    $( '#main sidebar ul li[data-username="' + data.username.toLowerCase() + '"] span.inactive,#main sidebar ul li[data-username="' + data.username.toLowerCase + '"] span.away' ).removeClass( 'inactive' ).removeClass( 'away' ).addClass( 'active' );

                    app.addMessage( data.username, data.message, data.image, data.date, false, init );
                }

                //if( inactive )
                //    mg.badge( (badgeAmount + 1) );

                //app.resize();
            });

            socket.on( 'messages', function( data ) {
                $.each( data, function(i) {
                    message = data[i];
                    app.addMessage( message.username, message.message, message.image, message.date, false, true );
                    
                    if( i == ( data.length - 1 ) ) {
                        app.scroll();
                        app.resize();
                    }
                });
            });

            socket.on( 'join conversation', function(data) {
                app.addUser( data.username, data.op, data.globalop, data.conversation );
            });

            socket.on( 'leave conversation', function(data) {
                app.removeUser( data.username, data.conversation );
            });

            socket.on( 'connect', function() {
                $( 'header section article h1 span' ).removeClass( 'away' ).removeClass( 'inactive' ).addClass( 'active' );
            });

            socket.on( 'reconnect', function() {
                app.reload();
                app.load();
                $( 'header section article h1 span' ).removeClass( 'away' ).removeClass( 'inactive' ).addClass( 'active' );
            });

            socket.on( 'disconnect', function() {
                $( 'header section article h1 span' ).removeClass( 'active' ).removeClass( 'inactive' ).addClass( 'away' );
            });

            if( hasMG ) {
                document.addEventListener( 'wake', function(){ 
                    $( app.load );
                }, true);
            }
        },
        resize: function() {
            $( '#main sidebar, #main section' ).css( 'height', 'auto' );
            $( '#main sidebar' ).height( $( window ).height() - 83 );
            $( '#main section' ).height( $( window ).height() - 83 );
            $( '#main section article' ).width( $( window ).width() - 200 );
            $( '#main section .chat ul li div:nth-child(2)' ).width( $( window ).width() - 280 );               
        },
        scroll: function() {
            $( '#main section' ).animate({ scrollTop: $( '#main section article:not(.hidden)' ).prop( 'scrollHeight' ) }, 300);
        }
    };

$( window ).load( function() {
    $( app.load );
    $( mg.load );
}).bind( 'blur', function(){
        inactive = true;
}).bind( 'focus', function(){
        inactive = false;
        //mg.badge( 0 );
}).bind( 'click', function(){
        inactive = false;
        //mg.badge( 0 );
});

$( window ).bind( 'resize', function(){
	app.resize();
    app.scroll();
});