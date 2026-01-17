package cli

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/tx"
	treasurytypes "github.com/tmp/marketplace/x/treasury/types"
)

// TxCmd returns the parent tx command for the treasury module.
func TxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "treasury",
		Short: "Treasury transactions",
	}
	cmd.AddCommand(cmdCreateMultisig())
	cmd.AddCommand(cmdScheduleDisbursement())
	cmd.AddCommand(cmdApproveDisbursement())
	return cmd
}

func cmdCreateMultisig() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create-multisig [index] [members(comma)] [threshold] [balance]",
		Short: "Create a multisig wallet (scaffold only)",
		Args:  cobra.ExactArgs(4),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}
			members := strings.Split(args[1], ",")
			msg := treasurytypes.MsgCreateMultisig{Index: args[0], Creator: clientCtx.GetFromAddress().String(), Members: members, Threshold: uint32(atoi(args[2])), Balance: uint64(atoi64(args[3]))}
			if err := msg.ValidateBasic(); err != nil {
				return err
			}
			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), &msg)
		},
	}
	return cmd
}

func cmdScheduleDisbursement() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "schedule-disbursement [index] [from] [to] [amount] [release_unix]",
		Short: "Schedule a disbursement (scaffold only)",
		Args:  cobra.ExactArgs(5),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}
			from := clientCtx.GetFromAddress().String()
			msg := treasurytypes.MsgScheduleDisbursement{Index: args[0], From: from, To: args[2], Amount: uint64(atoi64(args[3])), ReleaseAtUnix: atoi64(args[4])}
			if err := msg.ValidateBasic(); err != nil {
				return err
			}
			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), &msg)
		},
	}
	return cmd
}

func cmdApproveDisbursement() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "approve-disbursement [index] [approver]",
		Short: "Approve a disbursement (scaffold only)",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}
			approver := clientCtx.GetFromAddress().String()
			msg := treasurytypes.MsgApproveDisbursement{Index: args[0], Approver: approver}
			if err := msg.ValidateBasic(); err != nil {
				return err
			}
			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), &msg)
		},
	}
	return cmd
}

func atoi(s string) int {
	var v int
	fmt.Sscan(s, &v)
	return v
}

func atoi64(s string) int64 {
	var v int64
	fmt.Sscan(s, &v)
	return v
}
