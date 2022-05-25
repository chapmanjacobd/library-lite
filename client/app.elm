port module Main exposing (..)

import Html exposing (Html, button, div, text, br)
import Html.App as App
import Html.Events exposing (onClick)
import String exposing (toInt)

main : Program Never
main = App.program
  {
    init = init
  , view = view
  , update = update
  , subscriptions = subscriptions
  }

type alias Model = Int

init : (Model, Cmd Msg)
init = (0, Cmd.none)

subscriptions : Model -> Sub Msg
subscriptions model = load Load

type Msg = Increment | Decrement | Save | Doload | Load String

port save : String -> Cmd msg
port load : (String -> msg) -> Sub msg
port doload : () -> Cmd msg

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
      Increment ->
        ( model + 1, Cmd.none )
      Decrement ->
        ( model - 1, Cmd.none )
      Save ->
        ( model, save (toString model) )
      Doload ->
        ( model, doload () )
Load value ->
        case toInt value of
          Err msg ->
            ( 0, Cmd.none )
          Ok val ->
            ( val, Cmd.none )

view : Model -> Html Msg
view model =
  div []
    [ button [ onClick Decrement ] [ text "-" ]
    , div [] [ text (toString model) ]
    , button [ onClick Increment ] [ text "+" ]
    , br [] []
    , button [ onClick Save ] [ text "save" ]
    , br [] []
    , button [ onClick Doload ] [ text "load" ]
    ]

