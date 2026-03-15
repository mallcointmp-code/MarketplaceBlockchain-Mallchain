package main

import (
	"fmt"
	"reflect"

	vaultkeeper "github.com/tmp/marketplace/x/vault/keeper"
	_ "github.com/tmp/marketplace/x/vault/module"
)

func main() {
	t := reflect.TypeOf((*vaultkeeper.Keeper)(nil))
	fmt.Println("vault keeper type:", t)
}
